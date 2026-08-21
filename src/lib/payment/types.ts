// Payment Provider Abstraction Layer
// Drop in any gateway by implementing PaymentProvider

export interface CreateOrderParams {
  amount: number;       // in paise (rupees * 100)
  currency: string;
  orderId: string;      // our internal order number
  customerPhone: string;
  customerEmail?: string | null;
  customerName?: string;
}

export interface GatewayOrder {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;        // public key for client SDK
  gatewayName: string;
}

export interface VerifyParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface VerificationResult {
  verified: boolean;
  transactionId: string;
  status: "paid" | "failed";
}

export interface WebhookEvent {
  eventType: string;
  orderId: string;
  paymentId: string;
  status: "paid" | "failed" | "refunded";
  amount: number;
  metadata: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  createOrder(params: CreateOrderParams): Promise<GatewayOrder>;
  verifyPayment(params: VerifyParams): Promise<VerificationResult>;
  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
}
