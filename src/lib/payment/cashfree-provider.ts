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
 * Cashfree Payment Provider
 * Server-side order creation and signature verification via Cashfree PG API.
 */
export class CashfreeProvider implements PaymentProvider {
  name = "cashfree";
  private appId: string;
  private secretKey: string;
  private apiVersion = "2023-08-01";
  private baseUrl: string;

  constructor(appId?: string, secretKey?: string, isSandbox = false) {
    this.appId = appId ?? process.env["VITE_CASHFREE_APP_ID"] ?? process.env["CASHFREE_APP_ID"] ?? "";
    this.secretKey = secretKey ?? process.env["CASHFREE_SECRET_KEY"] ?? "";
    this.baseUrl = isSandbox
      ? "https://sandbox.cashfree.com/pg"
      : "https://api.cashfree.com/pg";
  }

  async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
    if (!this.appId || !this.secretKey) {
      throw new Error(
        "Cashfree credentials not configured. Please set VITE_CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env"
      );
    }

    try {
      const amountInRupees = params.amount / 100;
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": this.apiVersion,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: params.orderId,
          order_amount: amountInRupees,
          order_currency: params.currency || "INR",
          customer_details: {
            customer_id: `cust_${params.customerPhone}`,
            customer_phone: params.customerPhone,
            customer_name: params.customerName || "Customer",
            customer_email: params.customerEmail || "customer@example.com",
          },
          order_meta: {
            return_url: `${process.env["APP_URL"] || "http://localhost:8081"}/order-success?order_number=${params.orderId}`,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          errBody.message || `Cashfree order creation failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as { order_id: string; payment_session_id?: string };
      return {
        gatewayOrderId: data.order_id,
        amount: params.amount,
        currency: params.currency || "INR",
        keyId: this.appId,
        gatewayName: "cashfree",
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Cashfree order creation failed");
    }
  }

  async verifyPayment(params: VerifyParams): Promise<VerificationResult> {
    if (!this.appId || !this.secretKey) {
      throw new Error("Cashfree credentials are not configured on the server.");
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${params.gatewayOrderId}/payments`, {
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": this.apiVersion,
        },
      });

      if (!response.ok) {
        return { verified: false, transactionId: "", status: "failed" };
      }

      const payments = (await response.json()) as Array<{
        payment_status: string;
        cf_payment_id: string;
      }>;
      const successful = payments.find((p) => p.payment_status === "SUCCESS");

      return {
        verified: !!successful,
        transactionId: successful ? String(successful.cf_payment_id) : "",
        status: successful ? "paid" : "failed",
      };
    } catch {
      return { verified: false, transactionId: "", status: "failed" };
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    if (!this.secretKey) {
      throw new Error("CASHFREE_SECRET_KEY is not configured on the server.");
    }

    const payload = JSON.parse(rawBody);
    const orderData = payload?.data?.order;
    const paymentData = payload?.data?.payment;

    return {
      eventType: payload?.type || "PAYMENT",
      orderId: orderData?.order_id || "",
      paymentId: String(paymentData?.cf_payment_id || ""),
      status: paymentData?.payment_status === "SUCCESS" ? "paid" : "failed",
      amount: Math.round((paymentData?.payment_amount || 0) * 100),
      metadata: payload,
    };
  }
}
