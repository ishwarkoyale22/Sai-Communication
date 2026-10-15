// Shared, provider-agnostic helpers for telling a real secret apart from a placeholder one
// (REPLACE_ME, change-me, the rzp_test_xxxxxxxxxxxxxx sample in .env.example, etc.). Used to:
//   1. keep online payments OFF when Razorpay/Supabase config is incomplete or still templated
//      (src/lib/payment.server.ts), and
//   2. stop a garbage SUPABASE_SERVICE_ROLE_KEY from being sent to Supabase as-is, which would
//      make every admin query fail with 401 and surface to shoppers as a misleading
//      "product is no longer available" error (src/integrations/supabase/client.server.ts).
// No secret values are ever logged here — only booleans/the key material itself is returned.

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /replace[_-]?me/i,
  /change[_-]?me/i,
  /your[_-]?(key|secret|id|value)/i,
  /x{4,}/i, // the rzp_test_xxxxxxxxxxxxxx sample in .env.example
  /\bdummy\b/i,
  /\bplaceholder\b/i,
  /\bexample\b/i,
  /^<.*>$/, // "<your-key-here>" style
  /^(sk|pk)?_?test$/i,
];

export function isPlaceholderValue(value: string | undefined | null): boolean {
  if (!value || !value.trim()) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

// Razorpay key ids are always "rzp_test_..." or "rzp_live_...", alphanumeric after the prefix.
export function isValidRazorpayKeyId(value: string | undefined | null): value is string {
  if (!value || isPlaceholderValue(value)) return false;
  return /^rzp_(test|live)_[A-Za-z0-9]{8,}$/.test(value);
}

// Razorpay doesn't publish a fixed format for the key secret, so this only rejects obvious
// placeholders/too-short values rather than asserting an exact shape.
export function isValidOpaqueSecret(
  value: string | undefined | null,
  minLength = 12,
): value is string {
  if (!value || isPlaceholderValue(value)) return false;
  return value.trim().length >= minLength;
}

// Accepts either a legacy Supabase JWT service-role key (eyJ....) or a new-style sb_secret_...
// key. Must also be a genuinely different value from the publishable/anon key — otherwise the
// "admin" client is just the public client with extra steps, and the service_role-only payment
// SQL functions would reject it anyway.
export function isValidSupabaseServiceRoleKey(
  value: string | undefined | null,
  publishableKey?: string | undefined | null,
): value is string {
  if (!value || isPlaceholderValue(value)) return false;
  if (publishableKey && value === publishableKey) return false;
  const isJwt = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  const isNewStyleSecretKey = value.startsWith("sb_secret_");
  return isJwt || isNewStyleSecretKey;
}

/**
 * Decides which key a Supabase admin client should actually connect with: the service-role key
 * only when it passes isValidSupabaseServiceRoleKey, otherwise the publishable key — never an
 * unvalidated/placeholder value. Pure function so it's testable without a network call.
 */
export function resolveSupabaseAdminKey(
  serviceRoleKey: string | undefined | null,
  publishableKey: string | undefined | null,
): string | undefined {
  if (isValidSupabaseServiceRoleKey(serviceRoleKey, publishableKey)) {
    return serviceRoleKey;
  }
  return publishableKey ?? undefined;
}
