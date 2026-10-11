import { createFileRoute } from "@tanstack/react-router";

// Raw HTTP endpoint Razorpay's servers call directly (not our own frontend), so this is a
// server route rather than a createServerFn RPC. Configure it in the Razorpay Dashboard →
// Settings → Webhooks with events payment.captured and payment.failed.
export const Route = createFileRoute("/api/payments/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Imported lazily so the secret-reading, Node-only payment module can never be pulled
        // into a client chunk through this route file.
        const { handleRazorpayWebhook, PaymentConfigError } = await import("@/lib/payment.server");

        // The signature is computed over the exact bytes Razorpay sent, so read the raw text —
        // never re-serialize parsed JSON before verifying.
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");

        try {
          const result = await handleRazorpayWebhook(rawBody, signature);
          return Response.json(result, { status: 200 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Webhook processing failed";
          // Bad/missing signature or malformed body: a client error Razorpay should not retry.
          if (/signature/i.test(message) || err instanceof SyntaxError) {
            return Response.json({ ok: false, error: "Invalid webhook request" }, { status: 400 });
          }
          if (err instanceof PaymentConfigError) {
            console.error("[razorpay-webhook] misconfigured:", message);
            return Response.json({ ok: false, error: "Webhook not configured" }, { status: 503 });
          }
          // Genuine processing failure (e.g. DB error): 5xx so Razorpay retries the delivery.
          console.error("[razorpay-webhook] processing error:", message);
          return Response.json({ ok: false, error: "Processing error" }, { status: 500 });
        }
      },
    },
  },
});
