import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaymentProvider,
  CreateOrderParams,
  GatewayOrder,
  VerifyParams,
  VerificationResult,
  WebhookEvent,
  GatewayPayment,
} from "./types";

/**
 * Constant-time check that `signature` is the hex HMAC-SHA256 of `payload` under `secret`.
 * Used for both Checkout.js callback signatures (key secret) and webhook signatures
 * (webhook secret) — Razorpay uses a different secret for each.
 */
export function isValidRazorpaySignature(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payload).digest();
  // Hex-decode the claimed signature; anything that isn't exactly 32 bytes of hex is invalid.
  if (!/^[0-9a-fA-F]{64}$/.test(signature)) return false;
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

/**
 * Razorpay Payment Provider
 * Server-side order creation and cryptographic signature verification.
 */
export class RazorpayProvider implements PaymentProvider {
  name = "razorpay";
  private keyId: string;
  private keySecret: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId =
      keyId ?? process.env["RAZORPAY_KEY_ID"] ?? process.env["VITE_RAZORPAY_KEY_ID"] ?? "";
    this.keySecret = keySecret ?? process.env["RAZORPAY_KEY_SECRET"] ?? "";
  }

  async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
    if (!this.keyId || !this.keySecret) {
      throw new Error(
        "Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment",
      );
    }

    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(params.amount), // in paise
          currency: params.currency || "INR",
          receipt: params.orderId,
          notes: {
            order_id: params.orderId,
            customer_name: params.customerName ?? "",
            customer_phone: params.customerPhone,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          errBody.error?.description ||
            `Razorpay order creation failed with status ${response.status}`,
        );
      }

      const data = (await response.json()) as { id: string; amount: number; currency: string };
      return {
        gatewayOrderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: this.keyId,
        gatewayName: "razorpay",
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Razorpay order creation failed");
    }
  }

  async verifyPayment(params: VerifyParams): Promise<VerificationResult> {
    if (!this.keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured on the server.");
    }

    const payload = `${params.gatewayOrderId}|${params.gatewayPaymentId}`;
    const isMatch = isValidRazorpaySignature(payload, params.signature, this.keySecret);
    return {
      verified: isMatch,
      transactionId: params.gatewayPaymentId,
      status: isMatch ? "paid" : "failed",
    };
  }

  /**
   * Asks Razorpay (server-to-server, with our key pair) what it actually recorded for a payment.
   * The Checkout.js callback only proves the signature of (order_id|payment_id); it says nothing
   * about the amount or currency, so those must come from here.
   */
  async fetchPayment(gatewayPaymentId: string): Promise<GatewayPayment> {
    if (!this.keyId || !this.keySecret) {
      throw new Error("Razorpay credentials not configured.");
    }
    // The id is interpolated into a URL path: accept only Razorpay's own id shape.
    if (!/^pay_[A-Za-z0-9]{6,40}$/.test(gatewayPaymentId)) {
      throw new Error("Invalid payment id.");
    }
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${gatewayPaymentId}`, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new Error(`Razorpay payment lookup failed with status ${response.status}`);
    }
    const data = (await response.json()) as {
      id?: unknown;
      order_id?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
    };
    if (
      typeof data.id !== "string" ||
      typeof data.order_id !== "string" ||
      typeof data.amount !== "number" ||
      typeof data.currency !== "string" ||
      typeof data.status !== "string"
    ) {
      throw new Error("Razorpay payment lookup returned an unexpected response.");
    }
    return {
      id: data.id,
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      status: data.status,
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    // Webhooks are signed with the separate webhook secret configured in the Razorpay
    // Dashboard, NOT the API key secret.
    const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];
    if (!webhookSecret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
    }

    if (!isValidRazorpaySignature(rawBody, signature, webhookSecret)) {
      throw new Error("Invalid Razorpay webhook signature.");
    }

    const payload = JSON.parse(rawBody);
    const payment = payload?.payload?.payment?.entity;
    const isCaptured = payload.event === "payment.captured" || payment?.status === "captured";

    return {
      eventType: payload.event,
      orderId: payment?.notes?.order_id || payment?.order_id || "",
      paymentId: payment?.id || "",
      status: isCaptured ? "paid" : "failed",
      amount: payment?.amount || 0,
      metadata: payload,
    };
  }
}
