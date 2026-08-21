import { createHmac } from "crypto";
import type {
  PaymentProvider,
  CreateOrderParams,
  GatewayOrder,
  VerifyParams,
  VerificationResult,
  WebhookEvent,
} from "./types";

/**
 * Razorpay Payment Provider
 * Server-side order creation and cryptographic signature verification.
 */
export class RazorpayProvider implements PaymentProvider {
  name = "razorpay";
  private keyId: string;
  private keySecret: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId ?? process.env["VITE_RAZORPAY_KEY_ID"] ?? process.env["RAZORPAY_KEY_ID"] ?? "";
    this.keySecret = keySecret ?? process.env["RAZORPAY_KEY_SECRET"] ?? "";
  }

  async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
    if (!this.keyId || !this.keySecret) {
      throw new Error(
        "Razorpay credentials not configured. Please set VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
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
          errBody.error?.description || `Razorpay order creation failed with status ${response.status}`
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
    const expectedSignature = createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");

    const isMatch = expectedSignature === params.signature;
    return {
      verified: isMatch,
      transactionId: params.gatewayPaymentId,
      status: isMatch ? "paid" : "failed",
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    if (!this.keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured on the server.");
    }

    const expectedSignature = createHmac("sha256", this.keySecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
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
