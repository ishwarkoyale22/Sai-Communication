// Shared CORS allowlist for Edge Functions. Only browsers sending an Origin that exactly matches
// one of ALLOWED_ORIGINS get Access-Control-Allow-Origin back; every other Origin gets no CORS
// header at all, which makes the browser itself reject the response. Server-to-server calls (no
// Origin header, e.g. curl, another backend) are unaffected — CORS is a browser-only mechanism and
// never a substitute for the auth/role checks each function already does.
//
// Configure via the ALLOWED_ORIGINS secret (comma-separated, no spaces needed — they're trimmed):
//   supabase secrets set ALLOWED_ORIGINS="https://sai-communication.in,https://www.sai-communication.in"
// Add a preview/staging domain the same way, once it's a domain you actually control and trust:
//   supabase secrets set ALLOWED_ORIGINS="https://sai-communication.in,https://my-app-git-preview.vercel.app"
// Then redeploy the functions that use this file (`supabase functions deploy ai-extract create-staff`)
// so they pick up the new secret — Edge Function secrets are read at cold start, not per-request.
//
// No code change is needed to add/remove a domain — only the secret and a redeploy.

/** Parses the ALLOWED_ORIGINS secret into a safe list. Never returns "*": a literal "*" entry (or
 *  an unset/empty secret) is dropped rather than treated as "allow everything" — an empty allowlist
 *  just means every browser Origin is rejected, which is the safe failure mode, not an open one. */
export function parseAllowedOrigins(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0 && o !== "*");
}

const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));

/** Build per-request CORS headers. Pass the incoming `Origin` header (or null) and, in tests only,
 *  an explicit allowlist — production call sites omit it and get the ALLOWED_ORIGINS secret. */
export function corsHeaders(origin: string | null, allowedOrigins: string[] = ALLOWED_ORIGINS): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  // Only ever echo back an Origin that is in the allowlist — never fall back to a default origin
  // and never reflect an arbitrary request Origin. No match means no Access-Control-Allow-Origin
  // header at all, so the browser blocks the response itself.
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
