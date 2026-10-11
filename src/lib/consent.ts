import { supabase } from "@/integrations/supabase/client";

export type ConsentPurpose =
  | "account_creation"
  | "order_processing"
  | "repair_enquiry"
  | "marketing_communications";

// Bump this when the Privacy Policy materially changes what a purpose covers,
// so old consent_records rows stay interpretable against the version they agreed to.
export const CONSENT_POLICY_VERSION = "2026-10-11";

export async function recordConsent(entry: {
  fullName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  purpose: ConsentPurpose;
  granted: boolean;
  sourcePage: string;
}) {
  const { error } = await supabase.from("consent_records").insert({
    full_name: entry.fullName || null,
    phone: entry.phone || null,
    email: entry.email || null,
    purpose: entry.purpose,
    granted: entry.granted,
    policy_version: CONSENT_POLICY_VERSION,
    source_page: entry.sourcePage,
  });
  // Consent logging must never block the underlying action (signup/order/enquiry)
  // the user already completed — surface to console for staff/debug visibility only.
  if (error) console.error("Failed to record consent:", error.message);
}
