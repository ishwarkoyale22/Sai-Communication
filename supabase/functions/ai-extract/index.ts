// Supabase Edge Function: ai-extract
// Reads a phone BOX LABEL photo or a supplier INVOICE (photo or PDF) with Google Gemini and returns
// structured JSON for the Add Product / Invoice Import screens. Prompts, schemas and the Gemini call
// live in ../_shared/aiExtractCore.ts.
//
// Why a server function: the Gemini API key must never ship in the browser bundle. It lives only
// in this function's secrets:
//   supabase secrets set GEMINI_API_KEY=<key from https://aistudio.google.com/apikey>
//   supabase secrets set GEMINI_MODEL=gemini-3.1-flash-lite     # optional, see MODELS in the core file
//   supabase functions deploy ai-extract
//
// Only a signed-in ADMIN may call it (checked against profiles.role — every call costs money and
// sends a document to Google, so it must not be open to the public anon key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractWithGemini, MAX_BYTES } from "../_shared/aiExtractCore.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json(CORS_HEADERS, { ok: false, reason: "method_not_allowed" }, 405);

  const t0 = Date.now();
  const log = (msg: string) => console.log(`[ai-extract] +${Date.now() - t0}ms ${msg}`);

  try {
    const auth = await authorizeAdmin(req.headers.get("Authorization") ?? "", log);
    if (!auth.ok) return json(CORS_HEADERS, { ok: false, reason: auth.reason, detail: auth.detail }, auth.status);

    if (!GEMINI_API_KEY) return json(CORS_HEADERS, { ok: false, reason: "not_configured" }, 200);

    const body = await req.json().catch(() => null);
    const mode = body?.mode;
    const mimeType = String(body?.mimeType ?? "");
    const data = String(body?.data ?? "");
    if (mode !== "label" && mode !== "invoice") return json(CORS_HEADERS, { ok: false, reason: "bad_mode" }, 400);
    if (!/^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(mimeType) || !data) {
      return json(CORS_HEADERS, { ok: false, reason: "bad_file" }, 400);
    }
    if (data.length * 0.75 > MAX_BYTES) return json(CORS_HEADERS, { ok: false, reason: "file_too_large" }, 413);
    log(`request ok: mode=${mode} mime=${mimeType} ~${Math.round((data.length * 0.75) / 1024)}KB`);

    return json(CORS_HEADERS, await extractWithGemini(GEMINI_API_KEY, mode, mimeType, data, log));
  } catch (e) {
    console.error("[ai-extract] unhandled", e);
    return json(CORS_HEADERS, { ok: false, reason: "error", detail: e instanceof Error ? e.message : String(e) }, 500);
  }
});

type AuthResult = { ok: true; userId: string } | { ok: false; status: number; reason: string; detail?: string };

/** Who is calling, and are they an admin? The role is read first AS THE USER (the profiles RLS policy
 *  lets everyone read their own row, so this needs no privileged key), then with the service key as a
 *  backup — so a misconfigured/rotated service key can't turn every admin into "not admin". */
async function authorizeAdmin(authHeader: string, log: (m: string) => void): Promise<AuthResult> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, reason: "not_authenticated" };

  const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const userDb = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
    ...opts,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await userDb.auth.getUser(token);
  const user = userData?.user;
  if (!user) {
    log(`getUser failed: ${userErr?.message ?? "no user"}`);
    return { ok: false, status: 401, reason: "not_authenticated", detail: userErr?.message };
  }

  const own = await userDb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  let role: string | undefined = own.data?.role;
  let detail = own.error ? `as-user: ${own.error.message}` : "";

  if (!role && SERVICE_ROLE_KEY) {
    const priv = await createClient(SUPABASE_URL, SERVICE_ROLE_KEY, opts).from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = priv.data?.role;
    if (priv.error) detail += ` service: ${priv.error.message}`;
  }

  log(`user ${user.id} role=${role ?? "none"}${detail ? ` (${detail.trim()})` : ""}`);
  if (role !== "admin") return { ok: false, status: 403, reason: "admin_only", detail: detail.trim() || undefined };
  return { ok: true, userId: user.id };
}

function json(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
