// Run with: deno test supabase/functions/_shared/cors.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { corsHeaders, parseAllowedOrigins } from "./cors.ts";

const ALLOWED = ["https://sai-communication.in", "https://www.sai-communication.in"];

Deno.test("parseAllowedOrigins: splits and trims a comma-separated list", () => {
  assertEquals(parseAllowedOrigins("https://a.com, https://b.com"), ["https://a.com", "https://b.com"]);
});

Deno.test("parseAllowedOrigins: unset secret yields an empty allowlist, not a wildcard", () => {
  assertEquals(parseAllowedOrigins(undefined), []);
  assertEquals(parseAllowedOrigins(null), []);
  assertEquals(parseAllowedOrigins(""), []);
});

Deno.test("parseAllowedOrigins: drops a literal '*' entry instead of allowing everything", () => {
  assertEquals(parseAllowedOrigins("*"), []);
  assertEquals(parseAllowedOrigins("https://a.com,*"), ["https://a.com"]);
});

Deno.test("corsHeaders: an allowed origin is echoed back exactly", () => {
  const h = corsHeaders("https://sai-communication.in", ALLOWED);
  assertEquals(h["Access-Control-Allow-Origin"], "https://sai-communication.in");
});

Deno.test("corsHeaders: a second allowlisted origin (e.g. www) is also echoed back", () => {
  const h = corsHeaders("https://www.sai-communication.in", ALLOWED);
  assertEquals(h["Access-Control-Allow-Origin"], "https://www.sai-communication.in");
});

Deno.test("corsHeaders: an unapproved origin gets no Allow-Origin header at all", () => {
  const h = corsHeaders("https://evil.example.com", ALLOWED);
  assertEquals(h["Access-Control-Allow-Origin"], undefined);
});

Deno.test("corsHeaders: no Origin header (server-to-server call) gets no Allow-Origin header", () => {
  const h = corsHeaders(null, ALLOWED);
  assertEquals(h["Access-Control-Allow-Origin"], undefined);
});

Deno.test("corsHeaders: a near-miss origin (subdomain/path/scheme) is rejected, not fuzzy-matched", () => {
  for (const origin of ["http://sai-communication.in", "https://sai-communication.in.evil.com", "https://sai-communication.in/"]) {
    const h = corsHeaders(origin, ALLOWED);
    assertEquals(h["Access-Control-Allow-Origin"], undefined, `expected ${origin} to be rejected`);
  }
});

Deno.test("corsHeaders: preflight-relevant headers are always present regardless of match", () => {
  for (const origin of ["https://sai-communication.in", "https://evil.example.com", null]) {
    const h = corsHeaders(origin, ALLOWED);
    assertEquals(h["Access-Control-Allow-Methods"], "POST, OPTIONS");
    assertEquals(h["Access-Control-Allow-Headers"], "authorization, x-client-info, apikey, content-type");
    assertEquals(h["Vary"], "Origin");
  }
});

Deno.test("corsHeaders: empty allowlist (ALLOWED_ORIGINS unset) rejects every origin, including production", () => {
  const h = corsHeaders("https://sai-communication.in", []);
  assertEquals(h["Access-Control-Allow-Origin"], undefined);
});
