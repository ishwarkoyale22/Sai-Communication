// Server-only orchestration for online payments. Wires the gateway-agnostic
// PaymentProvider (src/lib/payment/) to website_orders via the SECURITY
// DEFINER functions in supabase/migrations/20261011020000_razorpay_payments.sql
// (see that migration for why). Those functions are granted to service_role ONLY, so this
// module refuses to run unless the server has a real SUPABASE_SERVICE_ROLE_KEY — with just the
// public publishable key anyone could call them from a browser and mark orders paid.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPaymentProvider } from "@/lib/payment";
import { isValidRazorpaySignature } from "@/lib/payment/razorpay-provider";

export class PaymentConfigError extends Error {}
export class PaymentOwnershipError extends Error {}

// True only with a distinct, real service-role key. client.server.ts silently falls back to the
// publishable key when SUPABASE_SERVICE_ROLE_KEY is unset; that must NOT count here.
export function hasRealServiceRoleKey(): boolean {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) return false;
  return (
    key !== process.env["SUPABASE_PUBLISHABLE_KEY"] &&
    key !== process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]
  );
}

// Enabled only when the provider is razorpay, the key id + secret are present, AND the server has a
// real service-role key — a half-configured deploy keeps the in-store checkout instead of offering a
// payment that can't work (or can't be trusted).
export function isOnlinePaymentEnabled(): { onlineEnabled: boolean } {
  const provider = (
    process.env["PAYMENT_PROVIDER"] ??
    process.env["VITE_PAYMENT_PROVIDER"] ??
    "offline"
  )
    .toLowerCase()
    .trim();
  const keyId = process.env["RAZORPAY_KEY_ID"] ?? process.env["VITE_RAZORPAY_KEY_ID"];
  return {
    onlineEnabled:
      provider === "razorpay" &&
      !!keyId &&
      !!process.env["RAZORPAY_KEY_SECRET"] &&
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
export async function createPaymentOrder(params: { orderId: string; customerPhone: string }) {
  assertRazorpayConfigured();

  const { data: order, error: lookupError } = await supabaseAdmin.rpc("web_get_order_for_payment", {
    p_order_id: params.orderId,
  });
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

  const provider = getPaymentProvider();

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

  const { data: attached, error: attachError } = await supabaseAdmin.rpc("web_set_order_gateway", {
    p_order_id: params.orderId,
    p_gateway_name: provider.name,
    p_gateway_order_id: gatewayOrder.gatewayOrderId,
  });
  if (attachError || !attached?.[0]) {
    throw new Error(attachError?.message || "Could not attach payment to this order.");
  }

  return { ...gatewayOrder, orderNumber: attached[0].order_number };
}

/**
 * Verifies the signature Razorpay's Checkout.js callback hands back on the
 * client, then applies the result via the idempotent SECURITY DEFINER
 * function. This is a defense-in-depth path, not the source of truth — the
 * webhook (handleRazorpayWebhook below) is what actually confirms payment,
 * since it comes from Razorpay's servers rather than the customer's browser.
 */
export async function verifyPaymentSignature(params: {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}) {
  assertRazorpayConfigured();

  const { data: order, error: lookupError } = await supabaseAdmin.rpc("web_get_order_for_payment", {
    p_order_id: params.orderId,
  });
  const row = order?.[0];
  if (lookupError || !row) throw new Error("Order not found.");

  // The client can claim any gatewayOrderId — only trust it if it matches
  // what we ourselves attached to this order when createPaymentOrder ran.
  if (row.gateway_order_id !== params.gatewayOrderId) {
    throw new PaymentOwnershipError("Payment does not match this order.");
  }

  const provider = getPaymentProvider();
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

  const { data: applied, error: applyError } = await supabaseAdmin.rpc("web_apply_payment_result", {
    p_gateway_order_id: params.gatewayOrderId,
    p_gateway_payment_id: params.gatewayPaymentId,
    p_status: "paid",
  });
  if (applyError || !applied?.[0]) {
    throw new Error(applyError?.message || "Could not record payment result.");
  }

  return {
    verified: result.verified,
    orderNumber: applied[0].order_number,
    paymentStatus: applied[0].payment_status,
  };
}

/**
 * Processes a Razorpay webhook delivery: verifies the signature over the
 * RAW body (never the re-parsed JSON — Razorpay signs the exact bytes sent),
 * de-dupes by (event type, payment id) so retried/duplicate deliveries are a
 * no-op, then applies the result the same way verifyPaymentSignature does.
 */
export async function handleRazorpayWebhook(rawBody: string, signature: string | null) {
  const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!webhookSecret) throw new PaymentConfigError("RAZORPAY_WEBHOOK_SECRET is not configured.");
  if (!hasRealServiceRoleKey()) {
    throw new PaymentConfigError("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  if (!signature) throw new Error("Missing webhook signature.");

  if (!isValidRazorpaySignature(rawBody, signature, webhookSecret)) {
    throw new Error("Invalid webhook signature.");
  }

  const payload = JSON.parse(rawBody);
  const eventType: string = payload?.event ?? "unknown";
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

  // Idempotency: the ledger row is written only AFTER the result is applied. Recording it first
  // would turn a transient failure into a permanent one — Razorpay's retry would hit the row,
  // be acknowledged as a "duplicate", and the payment would never be applied. Applying is itself
  // idempotent in SQL (a paid order is never changed again), so two deliveries racing past this
  // check are still safe.
  const eventKey = `${eventType}:${gatewayPaymentId}`;
  const { data: seen, error: seenError } = await supabaseAdmin
    .from("payment_webhook_events")
    .select("event_key")
    .eq("event_key", eventKey)
    .maybeSingle();
  if (seenError) throw new Error(seenError.message);
  if (seen) return { ok: true, duplicate: true };

  const { data: applied, error: applyError } = await supabaseAdmin.rpc("web_apply_payment_result", {
    p_gateway_order_id: gatewayOrderId,
    p_gateway_payment_id: gatewayPaymentId,
    p_status: isCaptured ? "paid" : "failed",
  });
  if (applyError?.message.includes("No order found")) {
    // A payment on this Razorpay account that isn't one of our website orders. Retrying can't
    // help, so acknowledge it instead of making Razorpay redeliver for 24 hours.
    console.warn(`[razorpay-webhook] no website order for gateway order ${gatewayOrderId}`);
    return { ok: true, ignored: true };
  }
  if (applyError || !applied?.[0]) {
    throw new Error(applyError?.message || "Could not record payment result.");
  }

  const { error: ledgerError } = await supabaseAdmin.from("payment_webhook_events").insert({
    event_key: eventKey,
    gateway_name: "razorpay",
    event_type: eventType,
    order_id: applied[0].id,
    payload,
  });
  // 23505 = a concurrent delivery already recorded it; anything else is only an audit-trail gap,
  // and the payment itself has been applied, so don't make Razorpay retry over it.
  if (ledgerError && ledgerError.code !== "23505") {
    console.error("[razorpay-webhook] could not write ledger row:", ledgerError.message);
  }

  return {
    ok: true,
    orderNumber: applied[0].order_number,
    paymentStatus: applied[0].payment_status,
  };
}

function razorpayKeyId(): string {
  return process.env["RAZORPAY_KEY_ID"] ?? process.env["VITE_RAZORPAY_KEY_ID"] ?? "";
}
