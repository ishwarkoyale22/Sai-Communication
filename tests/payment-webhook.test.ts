// Run with: npm test
// Mock-based security tests for handleRazorpayWebhook and verifyPaymentSignature. No network and
// no real Supabase/Razorpay: the database client and payment provider are injected.
// Covers: signature failures, malformed/missing data, amount/currency/gateway-order mismatches
// never producing a paid order, duplicate/replayed events, and database failures.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  handleRazorpayWebhook,
  verifyPaymentSignature,
  createPaymentOrder,
  PaymentConfigError,
  PaymentOwnershipError,
  WebhookSignatureError,
  WebhookPayloadError,
} from "../src/lib/payment.server.ts";

const ENV_KEYS = [
  "PAYMENT_PROVIDER",
  "VITE_PAYMENT_PROVIDER",
  "RAZORPAY_KEY_ID",
  "VITE_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

const WEBHOOK_SECRET = "whsec_fake_0123456789abcdef";
const PUBLISHABLE = "sb_publishable_FAKE_TEST_ONLY_0000000000000000";
const SERVICE_ROLE = "sb_secret_abcdefghijklmnopqrstuvwxyz0123456789";

let saved: Record<string, string | undefined> = {};
let errors: string[] = [];
const origError = console.error;
const origWarn = console.warn;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env["PAYMENT_PROVIDER"] = "razorpay";
  process.env["RAZORPAY_KEY_ID"] = "rzp_test_1DP5mmOlF5G5ag";
  process.env["RAZORPAY_KEY_SECRET"] = "8k2nF9pQmz7Lx4Rb1WvTgA6eYdC3sHu0";
  process.env["RAZORPAY_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
  process.env["SUPABASE_PUBLISHABLE_KEY"] = PUBLISHABLE;
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = SERVICE_ROLE;
  errors = [];
  console.error = (...a: unknown[]) => void errors.push(a.join(" "));
  console.warn = () => {};
});

afterEach(() => {
  console.error = origError;
  console.warn = origWarn;
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const sign = (body: string, secret = WEBHOOK_SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

type Res = { data?: unknown; error?: { code?: string; message: string } | null };

function mockDb(opts: { seen?: Res; rpc?: Record<string, Res>; insert?: Res } = {}) {
  const rpcCalls: { fn: string; args: any }[] = [];
  const inserts: any[] = [];
  const db: any = {
    rpc: (fn: string, args: any) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(opts.rpc?.[fn] ?? { data: null, error: null });
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(opts.seen ?? { data: null, error: null }),
        }),
      }),
      insert: (row: any) => {
        inserts.push(row);
        return Promise.resolve(opts.insert ?? { error: null });
      },
    }),
  };
  return { db, rpcCalls, inserts };
}

const payment = (over: Record<string, unknown> = {}) => ({
  id: "pay_Abc123XYZ789",
  order_id: "order_Abc123XYZ789",
  amount: 50000,
  currency: "INR",
  status: "captured",
  method: "upi",
  email: "payer@example.test",
  contact: "+919999999999",
  ...over,
});
const eventBody = (event = "payment.captured", p = payment()) =>
  JSON.stringify({ event, payload: { payment: { entity: p } } });

const applied = (result: string, extra: Record<string, unknown> = {}) => ({
  data: [{ id: "uuid-1", order_number: "SC-20261015-1234", payment_status: "paid", result, ...extra }],
  error: null,
});

describe("handleRazorpayWebhook: signature and body validation", () => {
  test("missing signature header → WebhookSignatureError, nothing touched", async () => {
    const { db, rpcCalls } = mockDb();
    await assert.rejects(handleRazorpayWebhook(eventBody(), null, db), WebhookSignatureError);
    assert.equal(rpcCalls.length, 0);
  });

  test("wrong-secret signature → WebhookSignatureError", async () => {
    const { db, rpcCalls } = mockDb();
    const body = eventBody();
    await assert.rejects(
      handleRazorpayWebhook(body, sign(body, "some_other_secret_value"), db),
      WebhookSignatureError,
    );
    assert.equal(rpcCalls.length, 0);
  });

  test("body tampered after signing → WebhookSignatureError", async () => {
    const { db, rpcCalls } = mockDb();
    const body = eventBody();
    await assert.rejects(
      handleRazorpayWebhook(body.replace("50000", "100"), sign(body), db),
      WebhookSignatureError,
    );
    assert.equal(rpcCalls.length, 0);
  });

  test("validly signed but malformed JSON → WebhookPayloadError", async () => {
    const { db, rpcCalls } = mockDb();
    const body = "{not json";
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), WebhookPayloadError);
    assert.equal(rpcCalls.length, 0);
  });

  test("captured event without amount → WebhookPayloadError, no paid transition", async () => {
    const { db, rpcCalls } = mockDb();
    const body = eventBody("payment.captured", payment({ amount: undefined }));
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), WebhookPayloadError);
    assert.equal(rpcCalls.length, 0);
  });

  test("captured event without currency → WebhookPayloadError", async () => {
    const { db, rpcCalls } = mockDb();
    const body = eventBody("payment.captured", payment({ currency: undefined }));
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), WebhookPayloadError);
    assert.equal(rpcCalls.length, 0);
  });

  test("events without a payment (e.g. refunds) are acknowledged and ignored", async () => {
    const { db, rpcCalls } = mockDb();
    const body = JSON.stringify({ event: "refund.created", payload: { refund: { entity: {} } } });
    assert.deepEqual(await handleRazorpayWebhook(body, sign(body), db), { ok: true, ignored: true });
    assert.equal(rpcCalls.length, 0);
  });

  test("missing webhook secret → PaymentConfigError (fail closed)", async () => {
    delete process.env["RAZORPAY_WEBHOOK_SECRET"];
    const { db } = mockDb();
    const body = eventBody();
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), PaymentConfigError);
  });

  test("invalid service-role key → PaymentConfigError (fail closed)", async () => {
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "REPLACE_ME";
    const { db, rpcCalls } = mockDb();
    const body = eventBody();
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), PaymentConfigError);
    assert.equal(rpcCalls.length, 0);
  });
});

describe("handleRazorpayWebhook: payment processing", () => {
  test("valid captured payment is applied with the reported amount and currency", async () => {
    const { db, rpcCalls, inserts } = mockDb({
      rpc: { web_apply_payment_result_v2: applied("applied") },
    });
    const body = eventBody();
    const res: any = await handleRazorpayWebhook(body, sign(body), db);
    assert.equal(res.ok, true);
    assert.equal(res.paymentStatus, "paid");
    assert.deepEqual(rpcCalls[0]!.args, {
      p_gateway_order_id: "order_Abc123XYZ789",
      p_gateway_payment_id: "pay_Abc123XYZ789",
      p_status: "paid",
      p_amount_paise: 50000,
      p_currency: "INR",
    });
    assert.equal(inserts[0].event_key, "payment.captured:pay_Abc123XYZ789");
  });

  test("audit ledger stores payment facts only, not payer contact details", async () => {
    const { db, inserts } = mockDb({ rpc: { web_apply_payment_result_v2: applied("applied") } });
    const body = eventBody();
    await handleRazorpayWebhook(body, sign(body), db);
    const stored = JSON.stringify(inserts[0].payload);
    assert.doesNotMatch(stored, /payer@example|9999999999|email|contact/);
    assert.match(stored, /pay_Abc123XYZ789/);
  });

  test("amount mismatch: not marked paid, flagged, audit row written, no paid ledger row", async () => {
    const { db, inserts } = mockDb({
      rpc: {
        web_apply_payment_result_v2: applied("mismatch", {
          payment_status: "pending",
          expected_amount_paise: 99900,
          expected_currency: "INR",
        }),
      },
    });
    const body = eventBody("payment.captured", payment({ amount: 100 }));
    const res: any = await handleRazorpayWebhook(body, sign(body), db);
    assert.equal(res.flagged, true);
    assert.equal(res.paymentStatus, "pending");
    assert.equal(inserts.length, 1);
    assert.match(inserts[0].event_key, /:mismatch$/);
    assert.equal(inserts[0].payload.expected_amount_paise, 99900);
    assert.ok(errors.some((e) => /MISMATCH/.test(e)));
    assert.ok(!inserts.some((r) => r.event_key === "payment.captured:pay_Abc123XYZ789"));
  });

  test("currency mismatch is passed through to the database and flagged the same way", async () => {
    const { db, rpcCalls } = mockDb({
      rpc: { web_apply_payment_result_v2: applied("mismatch", { payment_status: "pending" }) },
    });
    const body = eventBody("payment.captured", payment({ currency: "usd" }));
    const res: any = await handleRazorpayWebhook(body, sign(body), db);
    assert.equal(rpcCalls[0]!.args.p_currency, "USD");
    assert.equal(res.flagged, true);
  });

  test("gateway order mapping mismatch (no order for this gateway id) is ignored, not paid", async () => {
    const { db, inserts } = mockDb({
      rpc: {
        web_apply_payment_result_v2: {
          data: null,
          error: { message: "No order found for this gateway order id" },
        },
      },
    });
    const body = eventBody();
    assert.deepEqual(await handleRazorpayWebhook(body, sign(body), db), { ok: true, ignored: true });
    assert.equal(inserts.length, 0);
  });

  test("duplicate delivery (already in the ledger) is a no-op", async () => {
    const { db, rpcCalls } = mockDb({ seen: { data: { event_key: "x" }, error: null } });
    const body = eventBody();
    assert.deepEqual(await handleRazorpayWebhook(body, sign(body), db), { ok: true, duplicate: true });
    assert.equal(rpcCalls.length, 0);
  });

  test("replay after the order is already paid stays paid and does not throw", async () => {
    const { db } = mockDb({ rpc: { web_apply_payment_result_v2: applied("noop") } });
    const body = eventBody("payment.failed", payment({ status: "failed" }));
    const res: any = await handleRazorpayWebhook(body, sign(body), db);
    assert.equal(res.ok, true);
    assert.equal(res.paymentStatus, "paid");
  });

  test("payment.failed does not need amount/currency", async () => {
    const { db, rpcCalls } = mockDb({
      rpc: { web_apply_payment_result_v2: applied("applied", { payment_status: "failed" }) },
    });
    const body = eventBody("payment.failed", payment({ status: "failed", amount: undefined, currency: undefined }));
    const res: any = await handleRazorpayWebhook(body, sign(body), db);
    assert.equal(res.paymentStatus, "failed");
    assert.equal(rpcCalls[0]!.args.p_status, "failed");
    assert.equal(rpcCalls[0]!.args.p_amount_paise, null);
  });

  test("database error while applying → generic Error (retryable), raw text only in logs", async () => {
    const { db } = mockDb({
      rpc: { web_apply_payment_result_v2: { data: null, error: { code: "XX000", message: "connection to db.internal refused" } } },
    });
    const body = eventBody();
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), (e: Error) => {
      assert.doesNotMatch(e.message, /db\.internal/);
      assert.ok(!(e instanceof WebhookSignatureError) && !(e instanceof WebhookPayloadError));
      return true;
    });
    assert.ok(errors.some((e) => /db\.internal/.test(e)));
  });

  test("ledger lookup failure → generic Error (retryable)", async () => {
    const { db, rpcCalls } = mockDb({ seen: { data: null, error: { code: "XX000", message: "boom" } } });
    const body = eventBody();
    await assert.rejects(handleRazorpayWebhook(body, sign(body), db), /ledger lookup failed/i);
    assert.equal(rpcCalls.length, 0);
  });

  test("ledger write failure after a successful apply does not fail the webhook", async () => {
    const { db } = mockDb({
      rpc: { web_apply_payment_result_v2: applied("applied") },
      insert: { error: { code: "XX000", message: "audit insert failed" } },
    });
    const body = eventBody();
    const res: any = await handleRazorpayWebhook(body, sign(body), db);
    assert.equal(res.ok, true);
  });
});

// ── Client-callback verification ─────────────────────────────────────────────

const ORDER_ROW = {
  id: "uuid-1",
  order_number: "SC-20261015-1234",
  total_amount: 500,
  payment_status: "pending",
  gateway_order_id: "order_Abc123XYZ789",
  customer_phone: "9999999999",
};
const verifyParams = {
  orderId: "uuid-1",
  gatewayOrderId: "order_Abc123XYZ789",
  gatewayPaymentId: "pay_Abc123XYZ789",
  signature: "sig",
};
const gwPayment = (over: Record<string, unknown> = {}) => ({
  id: "pay_Abc123XYZ789",
  orderId: "order_Abc123XYZ789",
  amount: 50000,
  currency: "INR",
  status: "captured",
  ...over,
});
function fakeProvider(opts: { verified?: boolean; fetch?: () => Promise<any>; noFetch?: boolean } = {}) {
  const calls = { fetch: 0 };
  const p: any = {
    name: "razorpay",
    createOrder: async () => ({}),
    handleWebhook: async () => ({}),
    verifyPayment: async () => ({ verified: opts.verified ?? true, transactionId: "x", status: "paid" }),
  };
  if (!opts.noFetch) {
    p.fetchPayment = async () => {
      calls.fetch++;
      return (opts.fetch ?? (async () => gwPayment()))();
    };
  }
  return { provider: p, calls };
}
const orderRpc = { web_get_order_for_payment: { data: [ORDER_ROW], error: null } };

describe("verifyPaymentSignature: amount, currency and mapping checks", () => {
  test("matching captured payment is applied and reported verified", async () => {
    const { db, rpcCalls } = mockDb({ rpc: { ...orderRpc, web_apply_payment_result_v2: applied("applied") } });
    const { provider } = fakeProvider();
    const res = await verifyPaymentSignature(verifyParams, { db, provider });
    assert.equal(res.verified, true);
    const apply = rpcCalls.find((c) => c.fn === "web_apply_payment_result_v2")!;
    assert.equal(apply.args.p_amount_paise, 50000);
    assert.equal(apply.args.p_currency, "INR");
  });

  for (const [label, over] of [
    ["amount mismatch", { amount: 100 }],
    ["currency mismatch", { currency: "USD" }],
    ["payment belongs to a different gateway order", { orderId: "order_OTHER000000" }],
    ["payment id differs from the one claimed", { id: "pay_OTHER00000000" }],
  ] as const) {
    test(`${label}: not verified and never applied`, async () => {
      const { db, rpcCalls } = mockDb({ rpc: orderRpc });
      const { provider } = fakeProvider({ fetch: async () => gwPayment(over) });
      const res = await verifyPaymentSignature(verifyParams, { db, provider });
      assert.equal(res.verified, false);
      assert.ok(!rpcCalls.some((c) => c.fn === "web_apply_payment_result_v2"));
      assert.ok(errors.some((e) => /mismatch/.test(e)));
    });
  }

  test("authorized-but-not-captured payment is not marked paid", async () => {
    const { db, rpcCalls } = mockDb({ rpc: orderRpc });
    const { provider } = fakeProvider({ fetch: async () => gwPayment({ status: "authorized" }) });
    const res = await verifyPaymentSignature(verifyParams, { db, provider });
    assert.equal(res.verified, false);
    assert.ok(!rpcCalls.some((c) => c.fn === "web_apply_payment_result_v2"));
  });

  test("client claims a gateway order that is not the one attached to the order → ownership error", async () => {
    const { db } = mockDb({ rpc: orderRpc });
    const { provider } = fakeProvider();
    await assert.rejects(
      verifyPaymentSignature({ ...verifyParams, gatewayOrderId: "order_FORGED00000" }, { db, provider }),
      PaymentOwnershipError,
    );
  });

  test("bad signature: not verified and Razorpay is not even queried", async () => {
    const { db, rpcCalls } = mockDb({ rpc: orderRpc });
    const { provider, calls } = fakeProvider({ verified: false });
    const res = await verifyPaymentSignature(verifyParams, { db, provider });
    assert.equal(res.verified, false);
    assert.equal(calls.fetch, 0);
    assert.ok(!rpcCalls.some((c) => c.fn === "web_apply_payment_result_v2"));
  });

  test("provider without fetchPayment fails closed", async () => {
    const { db, rpcCalls } = mockDb({ rpc: orderRpc });
    const { provider } = fakeProvider({ noFetch: true });
    await assert.rejects(verifyPaymentSignature(verifyParams, { db, provider }), PaymentConfigError);
    assert.ok(!rpcCalls.some((c) => c.fn === "web_apply_payment_result_v2"));
  });

  test("Razorpay lookup failure → customer-safe error, never applied", async () => {
    const { db, rpcCalls } = mockDb({ rpc: orderRpc });
    const { provider } = fakeProvider({ fetch: async () => { throw new Error("socket hang up at 10.0.0.5"); } });
    await assert.rejects(verifyPaymentSignature(verifyParams, { db, provider }), (e: Error) => {
      assert.doesNotMatch(e.message, /socket|10\.0\.0\.5/);
      return true;
    });
    assert.ok(!rpcCalls.some((c) => c.fn === "web_apply_payment_result_v2"));
  });

  test("database says mismatch → not verified", async () => {
    const { db } = mockDb({ rpc: { ...orderRpc, web_apply_payment_result_v2: applied("mismatch", { payment_status: "pending" }) } });
    const { provider } = fakeProvider();
    const res = await verifyPaymentSignature(verifyParams, { db, provider });
    assert.equal(res.verified, false);
    assert.equal(res.paymentStatus, "pending");
  });

  test("database error while applying → customer-safe error", async () => {
    const { db } = mockDb({
      rpc: { ...orderRpc, web_apply_payment_result_v2: { data: null, error: { code: "42501", message: "permission denied for table website_orders" } } },
    });
    const { provider } = fakeProvider();
    await assert.rejects(verifyPaymentSignature(verifyParams, { db, provider }), (e: Error) => {
      assert.doesNotMatch(e.message, /permission denied|website_orders/);
      return true;
    });
  });

  test("online payment disabled (invalid service-role key) → PaymentConfigError", async () => {
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "REPLACE_ME";
    const { db } = mockDb({ rpc: orderRpc });
    const { provider } = fakeProvider();
    await assert.rejects(verifyPaymentSignature(verifyParams, { db, provider }), PaymentConfigError);
  });
});

// ── Creating / re-creating the gateway order (includes "customer closed the popup, then retries") ──

function creatingProvider() {
  const calls: any[] = [];
  const provider: any = {
    name: "razorpay",
    createOrder: async (p: any) => {
      calls.push(p);
      return { gatewayOrderId: "order_NEW000000001", amount: p.amount, currency: p.currency, keyId: "x", gatewayName: "razorpay" };
    },
    verifyPayment: async () => ({ verified: true }),
    handleWebhook: async () => ({}),
  };
  return { provider, calls };
}
const noGateway = { ...ORDER_ROW, gateway_order_id: null };
const payParams = { orderId: "uuid-1", customerPhone: "9999999999" };
const attachOk = { web_set_order_gateway: { data: [{ order_number: "SC-20261015-1234" }], error: null } };

describe("createPaymentOrder", () => {
  test("creates a gateway order from the STORED total (paise, INR) and attaches it", async () => {
    const { db, rpcCalls } = mockDb({ rpc: { web_get_order_for_payment: { data: [noGateway], error: null }, ...attachOk } });
    const { provider, calls } = creatingProvider();
    const res: any = await createPaymentOrder(payParams, { db, provider });
    assert.equal(calls[0].amount, 50000);
    assert.equal(calls[0].currency, "INR");
    assert.equal(res.gatewayOrderId, "order_NEW000000001");
    assert.equal(rpcCalls.find((c) => c.fn === "web_set_order_gateway")!.args.p_gateway_order_id, "order_NEW000000001");
  });

  test("customer closed the popup and retries: the SAME gateway order is reused, no second one", async () => {
    const { db, rpcCalls } = mockDb({ rpc: { web_get_order_for_payment: { data: [ORDER_ROW], error: null } } });
    const { provider, calls } = creatingProvider();
    const res: any = await createPaymentOrder(payParams, { db, provider });
    assert.equal(res.gatewayOrderId, "order_Abc123XYZ789");
    assert.equal(res.amount, 50000);
    assert.equal(calls.length, 0);
    assert.ok(!rpcCalls.some((c) => c.fn === "web_set_order_gateway"));
  });

  test("a previously failed payment can be retried", async () => {
    const failed = { ...ORDER_ROW, payment_status: "failed" };
    const { db } = mockDb({ rpc: { web_get_order_for_payment: { data: [failed], error: null } } });
    const { provider } = creatingProvider();
    const res: any = await createPaymentOrder(payParams, { db, provider });
    assert.equal(res.gatewayOrderId, "order_Abc123XYZ789");
  });

  test("phone with spaces/dashes still matches the order owner", async () => {
    const { db } = mockDb({ rpc: { web_get_order_for_payment: { data: [noGateway], error: null }, ...attachOk } });
    const { provider } = creatingProvider();
    await createPaymentOrder({ ...payParams, customerPhone: "99999-99999".replace("99999-99999", "9999 999-999") }, { db, provider });
  });

  test("someone else's phone number cannot start a payment for the order", async () => {
    const { db } = mockDb({ rpc: { web_get_order_for_payment: { data: [noGateway], error: null } } });
    const { provider, calls } = creatingProvider();
    await assert.rejects(createPaymentOrder({ ...payParams, customerPhone: "8888888888" }, { db, provider }), PaymentOwnershipError);
    assert.equal(calls.length, 0);
  });

  test("an already paid order cannot be paid again", async () => {
    const paid = { ...noGateway, payment_status: "paid" };
    const { db } = mockDb({ rpc: { web_get_order_for_payment: { data: [paid], error: null } } });
    const { provider, calls } = creatingProvider();
    await assert.rejects(createPaymentOrder(payParams, { db, provider }), /not awaiting payment/);
    assert.equal(calls.length, 0);
  });

  test("unknown order id", async () => {
    const { db } = mockDb({ rpc: { web_get_order_for_payment: { data: [], error: null } } });
    const { provider } = creatingProvider();
    await assert.rejects(createPaymentOrder(payParams, { db, provider }), /Order not found/);
  });

  test("database error while attaching the gateway order → safe message", async () => {
    const { db } = mockDb({
      rpc: {
        web_get_order_for_payment: { data: [noGateway], error: null },
        web_set_order_gateway: { data: null, error: { code: "XX000", message: "permission denied for table website_orders" } },
      },
    });
    const { provider } = creatingProvider();
    await assert.rejects(createPaymentOrder(payParams, { db, provider }), (e: Error) => {
      assert.doesNotMatch(e.message, /permission denied|website_orders/);
      return true;
    });
  });

  test("online payment disabled → PaymentConfigError, nothing created", async () => {
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "REPLACE_ME";
    const { db } = mockDb({ rpc: { web_get_order_for_payment: { data: [noGateway], error: null } } });
    const { provider, calls } = creatingProvider();
    await assert.rejects(createPaymentOrder(payParams, { db, provider }), PaymentConfigError);
    assert.equal(calls.length, 0);
  });
});