// Run with: npm test   (Node's built-in test runner; Node >= 22.18 strips TypeScript types natively)
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  RazorpayProvider,
  isValidRazorpaySignature,
} from "../src/lib/payment/razorpay-provider.ts";

const KEY_ID = "rzp_test_dummy";
const KEY_SECRET = "test_key_secret_not_real";
const WEBHOOK_SECRET = "test_webhook_secret_not_real";

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

describe("isValidRazorpaySignature", () => {
  test("accepts a correct signature", () => {
    assert.equal(isValidRazorpaySignature("abc", sign("abc", KEY_SECRET), KEY_SECRET), true);
  });
  test("rejects a signature made with a different secret", () => {
    assert.equal(isValidRazorpaySignature("abc", sign("abc", "other"), KEY_SECRET), false);
  });
  test("rejects a tampered payload", () => {
    assert.equal(isValidRazorpaySignature("abd", sign("abc", KEY_SECRET), KEY_SECRET), false);
  });
  test("rejects malformed signatures without throwing", () => {
    for (const bad of [
      "",
      "zz",
      "abc",
      sign("abc", KEY_SECRET).slice(2),
      sign("abc", KEY_SECRET) + "00",
    ]) {
      assert.equal(isValidRazorpaySignature("abc", bad, KEY_SECRET), false);
    }
  });
});

describe("RazorpayProvider.verifyPayment", () => {
  const provider = new RazorpayProvider(KEY_ID, KEY_SECRET);

  test("verifies order_id|payment_id signed with the key secret", async () => {
    const res = await provider.verifyPayment({
      gatewayOrderId: "order_1",
      gatewayPaymentId: "pay_1",
      signature: sign("order_1|pay_1", KEY_SECRET),
    });
    assert.deepEqual(res, { verified: true, transactionId: "pay_1", status: "paid" });
  });

  test("rejects a signature replayed against a different order id", async () => {
    const res = await provider.verifyPayment({
      gatewayOrderId: "order_2",
      gatewayPaymentId: "pay_1",
      signature: sign("order_1|pay_1", KEY_SECRET),
    });
    assert.equal(res.verified, false);
    assert.equal(res.status, "failed");
  });
});

describe("RazorpayProvider.handleWebhook", () => {
  const provider = new RazorpayProvider(KEY_ID, KEY_SECRET);
  const body = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: { entity: { id: "pay_9", order_id: "order_9", status: "captured", amount: 50000 } },
    },
  });
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env["RAZORPAY_WEBHOOK_SECRET"];
    process.env["RAZORPAY_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env["RAZORPAY_WEBHOOK_SECRET"];
    else process.env["RAZORPAY_WEBHOOK_SECRET"] = saved;
  });

  test("accepts a body signed with the webhook secret", async () => {
    const evt = await provider.handleWebhook(body, sign(body, WEBHOOK_SECRET));
    assert.equal(evt.status, "paid");
    assert.equal(evt.paymentId, "pay_9");
  });

  test("rejects a body signed with the API key secret instead of the webhook secret", async () => {
    await assert.rejects(
      () => provider.handleWebhook(body, sign(body, KEY_SECRET)),
      /Invalid Razorpay webhook signature/,
    );
  });

  test("rejects a body modified after signing", async () => {
    await assert.rejects(
      () => provider.handleWebhook(body.replace("50000", "1"), sign(body, WEBHOOK_SECRET)),
      /Invalid Razorpay webhook signature/,
    );
  });

  test("fails closed when the webhook secret is not configured", async () => {
    delete process.env["RAZORPAY_WEBHOOK_SECRET"];
    await assert.rejects(
      () => provider.handleWebhook(body, sign(body, WEBHOOK_SECRET)),
      /not configured/,
    );
  });
});

describe("RazorpayProvider.createOrder", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("sends paise amount, receipt and Basic auth to Razorpay", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ id: "order_new", amount: 129900, currency: "INR" }), {
        status: 200,
      });
    }) as typeof fetch;

    const out = await new RazorpayProvider(KEY_ID, KEY_SECRET).createOrder({
      amount: 129900,
      currency: "INR",
      orderId: "SC-20261011-1234",
      customerPhone: "9876543210",
    });

    assert.equal(seen?.url, "https://api.razorpay.com/v1/orders");
    const headers = seen?.init.headers as Record<string, string>;
    assert.equal(
      headers["Authorization"],
      `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
    );
    const sent = JSON.parse(String(seen?.init.body));
    assert.equal(sent.amount, 129900);
    assert.equal(sent.receipt, "SC-20261011-1234");
    assert.deepEqual(out, {
      gatewayOrderId: "order_new",
      amount: 129900,
      currency: "INR",
      keyId: KEY_ID,
      gatewayName: "razorpay",
    });
  });

  test("surfaces Razorpay API errors", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { description: "Authentication failed" } }), {
        status: 401,
      })) as typeof fetch;
    await assert.rejects(
      () =>
        new RazorpayProvider(KEY_ID, KEY_SECRET).createOrder({
          amount: 100,
          currency: "INR",
          orderId: "x",
          customerPhone: "9876543210",
        }),
      /Authentication failed/,
    );
  });

  test("refuses to call Razorpay without credentials", async () => {
    await assert.rejects(
      () =>
        new RazorpayProvider("", "").createOrder({
          amount: 100,
          currency: "INR",
          orderId: "x",
          customerPhone: "9",
        }),
      /credentials not configured/,
    );
  });
});
