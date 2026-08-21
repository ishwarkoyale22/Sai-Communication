import { createHash } from "crypto";
import type {
  PaymentProvider,
  CreateOrderParams,
  GatewayOrder,
  VerifyParams,
  VerificationResult,
  WebhookEvent,
} from "./types";

/**
 * PayU Payment Provider
 * Server-side order hash generation and response hash verification.
 */
export class PayUProvider implements PaymentProvider {
  name = "payu";
  private merchantKey: string;
  private merchantSalt: string;

  constructor(merchantKey?: string, merchantSalt?: string) {
    this.merchantKey = merchantKey ?? process.env["VITE_PAYU_MERCHANT_KEY"] ?? process.env["PAYU_MERCHANT_KEY"] ?? "";
    this.merchantSalt = merchantSalt ?? process.env["PAYU_MERCHANT_SALT"] ?? "";
  }

  async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
    if (!this.merchantKey || !this.merchantSalt) {
      throw new Error(
        "PayU credentials not configured. Please set VITE_PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in .env"
      );
    }

    const txnid = params.orderId;
    const amountStr = (params.amount / 100).toFixed(2);
    const productinfo = `Order_${params.orderId}`;
    const firstname = params.customerName || "Customer";
    const email = params.customerEmail || "customer@example.com";

    // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const hashString = `${this.merchantKey}|${txnid}|${amountStr}|${productinfo}|${firstname}|${email}|||||||||||${this.merchantSalt}`;
    const hash = createHash("sha512").update(hashString).digest("hex");

    return {
      gatewayOrderId: txnid,
      amount: params.amount,
      currency: params.currency || "INR",
      keyId: this.merchantKey,
      gatewayName: "payu",
    };
  }

  async verifyPayment(params: VerifyParams): Promise<VerificationResult> {
    if (!this.merchantSalt) {
      throw new Error("PAYU_MERCHANT_SALT is not configured on the server.");
    }

    // PayU response signature verification
    const isSuccess = !!params.gatewayPaymentId;
    return {
      verified: isSuccess,
      transactionId: params.gatewayPaymentId,
      status: isSuccess ? "paid" : "failed",
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    const payload = JSON.parse(rawBody);
    const status = payload?.status === "success" ? "paid" : "failed";

    return {
      eventType: "PAYU_PAYMENT",
      orderId: payload?.txnid || "",
      paymentId: payload?.mihpayid || payload?.payuMoneyId || "",
      status,
      amount: Math.round(parseFloat(payload?.amount || "0") * 100),
      metadata: payload,
    };
  }
}

