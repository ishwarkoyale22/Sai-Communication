import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Supabase project URL (data/API + realtime websocket) this app actually talks to.
const SUPABASE_URL = "https://egzcesgamwghmddxnent.supabase.co";

// Enforced in production (see withSecurityHeaders); Report-Only in dev.
// script-src/style-src need 'unsafe-inline' because the app has two static inline <script>
// tags (theme-flash + PWA-install-prompt capture in __root.tsx) and widespread React
// style={{...}} usage — tightening those to nonces/hashes is a follow-up, not required for
// Report-Only to be useful (it still restricts which external origins can load/connect/frame).
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // checkout.razorpay.com serves Checkout.js; cdn.razorpay.com serves its risk-detection bundle
  // (loaded by Checkout.js itself). These are the only third-party script origins.
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  // Razorpay Checkout talks to api.razorpay.com and reports telemetry to lumberjack.razorpay.com.
  `connect-src 'self' ${SUPABASE_URL} wss://egzcesgamwghmddxnent.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com`,
  // The payment popup renders inside Razorpay-hosted iframes.
  "frame-src https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://api.razorpay.com https://checkout.razorpay.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

function withSecurityHeaders(response: Response): Response {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  // Enforced in production builds. The dev server (Vite HMR websocket, injected scripts) stays on
  // Report-Only so local development isn't blocked.
  response.headers.set(
    import.meta.env.PROD ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    CSP_DIRECTIVES,
  );
  return response;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
