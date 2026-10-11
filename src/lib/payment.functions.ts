import { createServerFn } from "@tanstack/react-start";
import {
  createPaymentOrder,
  isOnlinePaymentEnabled,
  verifyPaymentSignature,
} from "./payment.server";

export type CreatePaymentOrderInput = { orderId: string; customerPhone: string };
export type VerifyPaymentInput = {
  orderId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
};

// Lets the checkout UI hide the online-payment option unless the server is actually configured
// for it, without ever shipping key material to the browser.
export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () =>
  isOnlinePaymentEnabled(),
);

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .validator((d: CreatePaymentOrderInput) => d)
  .handler(async ({ data }) => createPaymentOrder(data));

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .validator((d: VerifyPaymentInput) => d)
  .handler(async ({ data }) =>
    verifyPaymentSignature({
      orderId: data.orderId,
      gatewayOrderId: data.gatewayOrderId,
      gatewayPaymentId: data.gatewayPaymentId,
      signature: data.signature,
    }),
  );
