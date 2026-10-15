// Server-only orchestration for online payments. Wires the gateway-agnostic
// PaymentProvider (src/lib/payment/) to website_orders via the SECURITY
// DEFINER functions in supabase/migrations/20261011020000_razorpay_payments.sql
// (see that migration for why). Those functions are granted to service_role ONLY, so this
// module refuses to run unless the server has a real SUPABASE_SERVICE_ROLE_KEY — with just the
// public publishable key anyone could call them from a browser and mark orders paid.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPaymentProvider } from "@/lib/payment";
import type { PaymentProvider } from "@/lib/payment";
import { callRpc } from "@/lib/rpc.server";
import type { Json } from "@/integrations/supabase/types";
import { isValidRazorpaySignature } from "@/lib/payment/razorpay-provider";
import {
  isValidOpaqueSecret,
  isValidRazorpayKeyId,
  isValidSupabaseServiceRoleKey,
} from "@/lib/env-validation";

export class PaymentConfigError extends Error {}
export class PaymentOwnershipError extends Error {}

// True only with a distinct, real (not placeholder, not publishable-key-shaped) service-role key.
// client.server.ts falls back to the publishable key when SUPABASE_SERVICE_ROLE_KEY fails this
// same check (see resolveSupabaseAdminKey) — this must agree with that, or online payment could
// report "enabled" while the admin client is actually running on the public key underneath.
export function hasRealServiceRoleKey(): boolean {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const publishableKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  return isValidSupabaseServiceRoleKey(key, publishableKey);
}

// Enabled only when the provider is razorpay, the key id + secret are present AND look like real
// Razorpay credentials (not "REPLACE_ME", not the rzp_test_xxxxxxxxxxxxxx sample), AND the server
// has a real service-role key — a half-configured or still-templated deploy keeps the in-store
// checkout instead of offering a payment that can't work (or can't be trusted).
export function isOnlinePaymentEnabled(): { onlineEnabled: boolean } {
  const provider = (
    process.env["PAYMENT_PROVIDER"] ??
    process.env["VITE_PAYMENT_PROVIDER"] ??
    "offline"
  )
    .toLowerCase()
    .trim();
  const keyId = process.env["RAZORPAY_KEY_ID"] ?? process.env["VITE_RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  return {
    onlineEnabled:
      provider === "razorpay" &&
      isValidRazorpayKeyId(keyId) &&
      isValidOpaqueSecret(keySecret) &&
      hasRealServiceRoleKey(),
  };
}

function assertRazorpayConfigured() {
  if (!isOnlinePaymentEnabled().onlineEnabled) {
    throw new PaymentConfigError("Online payment is not enabled.");
  }
}

/**
 * Creates (or reuses, on retry) a gateway order for an already-placed,
 * still-pending website order, and attaches it via web_set_order_gateway.
 * The amount is never taken from the client — it is read back from the
 * order row that placeWebsiteOrder already computed server-side.
 */
export async function createPaymentOrder(
  params: { orderId: string; customerPhone: string },
  deps: PaymentDeps = {},
) {
  assertRazorpayConfigured();
  const db = deps.db ?? supabaseAdmin;

  const { data: order, error: lookupError } = await callRpc<OrderForPayment[]>(
    db,
    "web_get_order_for_payment",
    { p_order_id: params.orderId },
  );
  const row = order?.[0];
  if (lookupError || !row) throw new Error("Order not found.");
  // Ownership check: only the phone number that placed the order can create/
  // reuse a payment session for it — a guest-checkout order has no auth
  // session to check against, so this is the only binding we have.
  if (row.customer_phone !== params.customerPhone.replace(/[\s-]/g, "")) {
    throw new PaymentOwnershipError("This order does not belong to you.");
  }
  if (row.payment_status !== "pending" && row.payment_status !== "failed") {
    throw new Error("This order is not awaiting payment.");
  }

  const provider = deps.provider ?? getPaymentProvider();

  // Retry path: a gateway order was already created for this order (e.g. the
  // customer closed the popup and clicked "Pay" again) — reuse it rather
  // than minting a second Razorpay order for the same website order.
  if (row.gateway_order_id) {
    return {
      gatewayOrderId: row.gateway_order_id,
      amount: Math.round(Number(row.total_amount) * 100),
      currency: "INR",
      keyId: provider.name === "razorpay" ? razorpayKeyId() : "",
      gatewayName: provider.name,
      orderNumber: row.order_number,
    };
  }

  const gatewayOrder = await provider.createOrder({
    amount: Math.round(Number(row.total_amount) * 100),
    currency: "INR",
    orderId: row.order_number,
    customerPhone: params.customerPhone,
  });

  const { data: attached, error: attachError } = await callRpc<{ order_number: string }[]>(
    db,
    "web_set_order_gateway",
    {
      p_order_id: params.orderId,
      p_gateway_name: provider.name,
      p_gateway_order_id: gatewayOrder.gatewayOrderId,
    },
  );
  if (attachError || !attached?.[0]) {
    console.error("[payment] web_set_order_gateway failed:", attachError?.code, attachError?.message);
    throw new Error("Could not start the payment. Please try again.");
  }

  return { ...gatewayOrder, orderNumber: attached[0].order_number };
}

type PaymentDb = Pick<typeof supabaseAdmin, "from" | "rpc">;
type PaymentDeps = { db?: PaymentDb; provider?: PaymentProvider };

type OrderForPayment = {
  id: string;
  order_number: string;
  total_amount: number | string;
  payment_status: string;
  gateway_order_id: string | null;
  customer_phone: string;
};

type AppliedPayment = {
  id: string;
  order_number: string;
  payment_status: string;
  result: "applied" | "noop" | "mismatch";
  expected_amount_paise?: number | null;
  expected_currency?: string | null;
};

// Thrown for webhook requests that are the sender's fault (route maps both to HTTP 400).
export class WebhookSignatureError extends Error {}
export class WebhookPayloadError extends Error {}

// Every website order is priced in INR (see the currency column in the checkout migration).
const EXPECTED_CURRENCY = "INR";

const PAYMENT_UNCONFIRMED_MESSAGE =
  "We couldn't confirm your payment right now. If money was deducted, it will be confirmed automatically — contact the store with your order number if it isn't.";

const expectedPaise = (totalAmount: number | string) => Math.round(Number(totalAmount) * 100);

/**
 * Verifies a payment the browser says succeeded. The Checkout.js signature only proves
 * (order_id|payment_id) came from Razorpay; it says nothing about the amount or currency, so the
 * payment is also fetched from Razorpay server-to-server and compared against the order we hold.
 * Any mismatch leaves the order untouched — this is defense in depth, the webhook is the source
 * of truth.
 */
export async function verifyPaymentSignature(
  params: {
    orderId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    signature: string;
  },
  deps: PaymentDeps = {},
) {
  assertRazorpayConfigured();
  const db = deps.db ?? supabaseAdmin;

  const { data: order, error: lookupError } = await callRpc<OrderForPayment[]>(
    db,
    "web_get_order_for_payment",
    { p_order_id: params.orderId },
  );
  const row = order?.[0];
  if (lookupError || !row) throw new Error("Order not found.");

  // The client can claim any gatewayOrderId — only trust it if it matches
  // what we ourselves attached to this order when createPaymentOrder ran.
  if (row.gateway_order_id !== params.gatewayOrderId) {
    throw new PaymentOwnershipError("Payment does not match this order.");
  }

  const provider = deps.provider ?? getPaymentProvider();
  const result = await provider.verifyPayment({
    gatewayOrderId: params.gatewayOrderId,
    gatewayPaymentId: params.gatewayPaymentId,
    signature: params.signature,
  });

  // A bad signature is not evidence the payment failed (it may be a tampered or garbled callback),
  // so leave the order untouched — the webhook is what records genuine failures.
  if (!result.verified) {
    return { verified: false, orderNumber: row.order_number, paymentStatus: row.payment_status };
  }

  if (!provider.fetchPayment) {
    console.error("[payment] provider cannot look payments up; refusing to mark paid.");
    throw new PaymentConfigError("Payment lookup is not supported by the configured provider.");
  }
  let payment;
  try {
    payment = await provider.fetchPayment(params.gatewayPaymentId);
  } catch (err) {
    console.error("[payment] payment lookup failed:", err instanceof Error ? err.message : "unknown");
    throw new Error(PAYMENT_UNCONFIRMED_MESSAGE);
  }

  const expected = expectedPaise(row.total_amount);
  const problems: string[] = [];
  if (payment.id !== params.gatewayPaymentId) problems.push("payment id");
  if (payment.orderId !== params.gatewayOrderId) problems.push("gateway order");
  if (payment.currency !== EXPECTED_CURRENCY) problems.push("currency");
  if (payment.amount !== expected) problems.push("amount");
  if (problems.length) {
    console.error(
      `[payment] verification mismatch (${problems.join(", ")}) for ${row.order_number}: ` +
        `payment ${params.gatewayPaymentId}, expected ${expected} ${EXPECTED_CURRENCY}, ` +
        `got ${payment.amount} ${payment.currency}`,
    );
    return { verified: false, orderNumber: row.order_number, paymentStatus: row.payment_status };
  }
  // Authorized-but-not-captured is not money in hand; the webhook settles it when captured.
  if (payment.status !== "captured") {
    console.warn(`[payment] ${row.order_number}: payment ${params.gatewayPaymentId} is ${payment.status}, not captured.`);
    return { verified: false, orderNumber: row.order_number, paymentStatus: row.payment_status };
  }

  const { data: applied, error: applyError } = await callRpc<AppliedPayment[]>(
    db,
    "web_apply_payment_result_v2",
    {
      p_gateway_order_id: params.gatewayOrderId,
      p_gateway_payment_id: params.gatewayPaymentId,
      p_status: "paid",
      p_amount_paise: payment.amount,
      p_currency: payment.currency,
    },
  );
  const appliedRow = applied?.[0];
  if (applyError || !appliedRow) {
    console.error("[payment] web_apply_payment_result_v2 failed:", applyError?.code, applyError?.message);
    throw new Error(PAYMENT_UNCONFIRMED_MESSAGE);
  }
  if (appliedRow.result === "mismatch") {
    console.error(`[payment] database rejected payment ${params.gatewayPaymentId} for ${appliedRow.order_number}: amount/currency mismatch.`);
    return { verified: false, orderNumber: appliedRow.order_number, paymentStatus: appliedRow.payment_status };
  }

  return {
    verified: true,
    orderNumber: appliedRow.order_number,
    paymentStatus: appliedRow.payment_status,
  };
}

// The webhook payload carries payer contact details; the audit ledger only needs the payment facts.
function redactWebhookPayload(
  eventType: string,
  payment: Record<string, unknown> | undefined,
): { event: string; payment: { [key: string]: Json } } {
  const pick = (k: string) => (payment?.[k] ?? null) as Json;
  return {
    event: eventType,
    payment: {
      id: pick("id"),
      order_id: pick("order_id"),
      amount: pick("amount"),
      currency: pick("currency"),
      status: pick("status"),
      method: pick("method"),
    },
  };
}

/**
 * Processes a Razorpay webhook delivery: verifies the signature over the RAW body (never the
 * re-parsed JSON — Razorpay signs the exact bytes sent), de-dupes by (event type, payment id) so
 * retried/duplicate deliveries are a no-op, and only marks an order paid when the amount and
 * currency Razorpay reports match the order we hold (enforced again in SQL by
 * web_apply_payment_result_v2, so a bug here cannot bypass it).
 *
 * Throws WebhookSignatureError / WebhookPayloadError for the sender's mistakes (HTTP 4xx),
 * PaymentConfigError when we are misconfigured (5xx), and a plain Error for database failures
 * (5xx, so Razorpay retries).
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string | null,
  db: PaymentDb = supabaseAdmin,
) {
  const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!isValidOpaqueSecret(webhookSecret)) {
    throw new PaymentConfigError("RAZORPAY_WEBHOOK_SECRET is not configured.");
  }
  if (!hasRealServiceRoleKey()) {
    throw new PaymentConfigError("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  if (!signature) throw new WebhookSignatureError("Missing webhook signature.");
  if (!isValidRazorpaySignature(rawBody, signature, webhookSecret)) {
    throw new WebhookSignatureError("Invalid webhook signature.");
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new WebhookPayloadError("Malformed webhook body.");
  }
  const eventType: string = typeof payload?.event === "string" ? payload.event : "unknown";
  const payment = payload?.payload?.payment?.entity;
  const gatewayPaymentId: string | undefined = payment?.id;
  const gatewayOrderId: string | undefined = payment?.order_id;

  if (!gatewayPaymentId || !gatewayOrderId) {
    // Events we don't act on (e.g. refund/dispute webhooks) — acknowledge
    // without processing rather than erroring, so Razorpay doesn't retry
    // something we deliberately ignore.
    return { ok: true, ignored: true };
  }

  const isCaptured = eventType === "payment.captured" || payment?.status === "captured";
  const isFailed = eventType === "payment.failed" || payment?.status === "failed";
  if (!isCaptured && !isFailed) return { ok: true, ignored: true };

  // A paid-state transition needs the amount and currency to compare; without them we cannot
  // tell a real payment from a short or foreign-currency one, so refuse rather than guess.
  if (isCaptured && (typeof payment?.amount !== "number" || typeof payment?.currency !== "string")) {
    throw new WebhookPayloadError("Captured payment is missing amount or currency.");
  }

  // Idempotency: the ledger row is written only AFTER the result is applied. Recording it first
  // would turn a transient failure into a permanent one — Razorpay's retry would hit the row,
  // be acknowledged as a "duplicate", and the payment would never be applied. Applying is itself
  // idempotent in SQL (a paid order is never changed again), so two deliveries racing past this
  // check are still safe.
  const eventKey = `${eventType}:${gatewayPaymentId}`;
  const { data: seen, error: seenError } = await db
    .from("payment_webhook_events")
    .select("event_key")
    .eq("event_key", eventKey)
    .maybeSingle();
  if (seenError) {
    console.error("[razorpay-webhook] ledger lookup failed:", seenError.code, seenError.message);
    throw new Error("Webhook ledger lookup failed.");
  }
  if (seen) return { ok: true, duplicate: true };

  const { data: applied, error: applyError } = await callRpc<AppliedPayment[]>(
    db,
    "web_apply_payment_result_v2",
    {
      p_gateway_order_id: gatewayOrderId,
      p_gateway_payment_id: gatewayPaymentId,
      p_status: isCaptured ? "paid" : "failed",
      p_amount_paise: typeof payment?.amount === "number" ? payment.amount : null,
      p_currency: typeof payment?.currency === "string" ? payment.currency.toUpperCase() : null,
    },
  );
  if (applyError?.message.includes("No order found")) {
    // A payment on this Razorpay account that isn't one of our website orders. Retrying can't
    // help, so acknowledge it instead of making Razorpay redeliver for 24 hours.
    console.warn(`[razorpay-webhook] no website order for gateway order ${gatewayOrderId}`);
    return { ok: true, ignored: true };
  }
  const row = applied?.[0];
  if (applyError || !row) {
    console.error("[razorpay-webhook] apply failed:", applyError?.code, applyError?.message);
    throw new Error("Could not record payment result.");
  }

  if (row.result === "mismatch") {
    // Validly signed, but the money doesn't match the order: do NOT mark it paid. Keep an audit
    // row so a human can reconcile it (payment may need a manual refund). 200, because a retry
    // would produce the same answer.
    console.error(
      `[razorpay-webhook] AMOUNT/CURRENCY MISMATCH for ${row.order_number}: payment ${gatewayPaymentId}, ` +
        `expected ${row.expected_amount_paise ?? "?"} ${row.expected_currency ?? "?"}, ` +
        `got ${payment.amount} ${payment.currency}`,
    );
    const { error: auditError } = await db.from("payment_webhook_events").insert({
      event_key: `${eventKey}:mismatch`,
      gateway_name: "razorpay",
      event_type: `${eventType}:mismatch`,
      order_id: row.id,
      payload: {
        ...redactWebhookPayload(eventType, payment),
        expected_amount_paise: row.expected_amount_paise ?? null,
        expected_currency: row.expected_currency ?? null,
      },
    });
    if (auditError && auditError.code !== "23505") {
      console.error("[razorpay-webhook] could not write mismatch audit row:", auditError.code, auditError.message);
    }
    return { ok: true, flagged: true, orderNumber: row.order_number, paymentStatus: row.payment_status };
  }

  const { error: ledgerError } = await db.from("payment_webhook_events").insert({
    event_key: eventKey,
    gateway_name: "razorpay",
    event_type: eventType,
    order_id: row.id,
    payload: redactWebhookPayload(eventType, payment),
  });
  // 23505 = a concurrent delivery already recorded it; anything else is only an audit-trail gap,
  // and the payment itself has been applied, so don't make Razorpay retry over it.
  if (ledgerError && ledgerError.code !== "23505") {
    console.error("[razorpay-webhook] could not write ledger row:", ledgerError.code, ledgerError.message);
  }

  return {
    ok: true,
    orderNumber: row.order_number,
    paymentStatus: row.payment_status,
  };
}
function razorpayKeyId(): string {
  return process.env["RAZORPAY_KEY_ID"] ?? process.env["VITE_RAZORPAY_KEY_ID"] ?? "";
}
