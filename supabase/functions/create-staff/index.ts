// Supabase Edge Function: create-staff
// Called by the Admin Portal ("Add Staff" form) with the caller's admin JWT.
// Creates a Supabase Auth user (email = "<phone>@staff.internal", password = PIN),
// inserts the staff row, and links profiles.staff_id — all with the service role,
// since staff-portal clients are never allowed to self-provision accounts.
//
// Deploy: supabase functions deploy create-staff
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
// for every deployed function — no `supabase secrets set` needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller is an authenticated admin
    const {
      data: { user },
    } = await callerClient.auth.getUser();
    if (!user) {
      return json(CORS_HEADERS, { error: "Not authenticated" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return json(CORS_HEADERS, { error: "Admin only" }, 403);
    }

    const { name, role, phone, pin } = await req.json();
    if (!name || !phone || !pin || String(pin).length !== 4) {
      return json(CORS_HEADERS, { error: "name, phone, and a 4-digit pin are required" }, 400);
    }

    const email = `${phone}@staff.internal`;

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: String(pin),
      email_confirm: true,
    });
    if (authErr) return json(CORS_HEADERS, { error: authErr.message }, 400);

    const { data: staffRow, error: staffErr } = await admin
      .from("staff")
      .insert({ name, role: role ?? "cashier", phone, pin: String(pin), auth_user_id: authUser.user.id })
      .select()
      .single();
    if (staffErr) return json(CORS_HEADERS, { error: staffErr.message }, 400);

    const { error: profileErr } = await admin
      .from("profiles")
      .insert({ id: authUser.user.id, role: "staff", staff_id: staffRow.id });
    if (profileErr) return json(CORS_HEADERS, { error: profileErr.message }, 400);

    return json(CORS_HEADERS, { staff: staffRow });
  } catch (e) {
    return json(CORS_HEADERS, { error: String(e) }, 500);
  }
});

function json(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
