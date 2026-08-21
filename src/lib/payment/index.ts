import type {
  PaymentProvider,
  CreateOrderParams,
  GatewayOrder,
  VerifyParams,
  VerificationResult,
  WebhookEvent,
} from "./types";
import { RazorpayProvider } from "./razorpay-provider";
import { CashfreeProvider } from "./cashfree-provider";
import { PayUProvider } from "./payu-provider";

export * from "./types";
export * from "./razorpay-provider";
export * from "./cashfree-provider";
export * from "./payu-provider";

/**
 * Offline/Cash payment provider
 * Preserved for in-store collection, COD, and initial setup.
 */
export class OfflinePaymentProvider implements PaymentProvider {
  name = "offline";

  async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
    return {
      gatewayOrderId: `OFFLINE-${params.orderId}-${Date.now()}`,
      amount: params.amount,
      currency: params.currency || "INR",
      keyId: "offline",
      gatewayName: "offline",
    };
  }

  async verifyPayment(_params: VerifyParams): Promise<VerificationResult> {
    // Offline orders are verified manually by store admin upon cash/UPI collection
    return { verified: false, transactionId: "", status: "failed" };
  }

  async handleWebhook(_rawBody: string, _signature: string): Promise<WebhookEvent> {
    throw new Error("Webhooks not supported for offline provider");
  }
}

export const offlineProvider = new OfflinePaymentProvider();

/**
 * HOW TO SWITCH PAYMENT PROVIDERS:
 * =================================
 * In your .env file, set:
 *
 * 1. For Razorpay:
 *    VITE_PAYMENT_PROVIDER=razorpay
 *    VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
 *    RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
 *
 * 2. For Cashfree:
 *    VITE_PAYMENT_PROVIDER=cashfree
 *    VITE_CASHFREE_APP_ID=cf_app_xxxxxxxx
 *    CASHFREE_SECRET_KEY=xxxxxxxxxxxxxxxx
 *
 * 3. For PayU:
 *    VITE_PAYMENT_PROVIDER=payu
 *    VITE_PAYU_MERCHANT_KEY=xxxxxx
 *    PAYU_MERCHANT_SALT=xxxxxx
 *
 * 4. For In-Store / Cash / Offline (Default):
 *    VITE_PAYMENT_PROVIDER=offline
 *
 * NOTE: If VITE_PAYMENT_PROVIDER is not set, it safely defaults to OfflinePaymentProvider.
 */
export function getPaymentProvider(): PaymentProvider {
  const provider = (
    process.env["VITE_PAYMENT_PROVIDER"] ||
    process.env["PAYMENT_PROVIDER"] ||
    process.env["PAYMENT_GATEWAY"] ||
    "offline"
  ).toLowerCase().trim();

  switch (provider) {
    case "razorpay":
      return new RazorpayProvider();
    case "cashfree":
      return new CashfreeProvider();
    case "payu":
    case "payuprovider":
      return new PayUProvider();
    case "offline":
    default:
      return offlineProvider;
  }
}
