// Run with: npm test
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholderValue,
  isValidRazorpayKeyId,
  isValidOpaqueSecret,
  isValidSupabaseServiceRoleKey,
  resolveSupabaseAdminKey,
} from "../src/lib/env-validation.ts";

describe("isPlaceholderValue", () => {
  test("flags common placeholder strings", () => {
    for (const v of [
      "REPLACE_ME",
      "replace-me",
      "change-me",
      "your-key-here",
      "rzp_test_xxxxxxxxxxxxxx",
      "dummy",
      "placeholder",
      "<your-secret>",
      "",
      "   ",
    ]) {
      assert.equal(isPlaceholderValue(v), true, `expected "${v}" to be a placeholder`);
    }
  });

  test("does not flag a realistic-looking secret", () => {
    assert.equal(isPlaceholderValue("8k2nF9pQmz7Lx4Rb1WvTgA6eYdC3sHu0"), false);
  });

  test("treats undefined/null as a placeholder", () => {
    assert.equal(isPlaceholderValue(undefined), true);
    assert.equal(isPlaceholderValue(null), true);
  });
});

describe("isValidRazorpayKeyId", () => {
  test("accepts a realistic test key id", () => {
    assert.equal(isValidRazorpayKeyId("rzp_test_1DP5mmOlF5G5ag"), true);
  });
  test("accepts a realistic live key id", () => {
    assert.equal(isValidRazorpayKeyId("rzp_live_AbCdEf1234567890"), true);
  });
  test("rejects the .env.example sample", () => {
    assert.equal(isValidRazorpayKeyId("rzp_test_xxxxxxxxxxxxxx"), false);
  });
  test("rejects a REPLACE_ME-prefixed value even with a valid-looking suffix", () => {
    assert.equal(isValidRazorpayKeyId("REPLACE_ME_rzp_test_xxxxxxxxxxxxxx"), false);
  });
  test("rejects missing prefix / empty / undefined", () => {
    assert.equal(isValidRazorpayKeyId("just-some-string"), false);
    assert.equal(isValidRazorpayKeyId(""), false);
    assert.equal(isValidRazorpayKeyId(undefined), false);
  });
});

describe("isValidOpaqueSecret", () => {
  test("accepts a sufficiently long, non-placeholder secret", () => {
    assert.equal(isValidOpaqueSecret("8k2nF9pQmz7Lx4Rb1WvTgA6eYdC3sHu0"), true);
  });
  test("rejects REPLACE_ME", () => {
    assert.equal(isValidOpaqueSecret("REPLACE_ME"), false);
  });
  test("rejects a too-short value", () => {
    assert.equal(isValidOpaqueSecret("short"), false);
  });
  test("rejects undefined", () => {
    assert.equal(isValidOpaqueSecret(undefined), false);
  });
});

describe("isValidSupabaseServiceRoleKey", () => {
  const publishableKey = "sb_publishable_FAKE_TEST_ONLY_0000000000000000";
  const realJwtShaped =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlLWxvb2tzLWxpa2UtdGhpcw";
  const realSecretShaped = "sb_secret_abcdefghijklmnopqrstuvwxyz0123456789";

  test("accepts a JWT-shaped service-role key distinct from the publishable key", () => {
    assert.equal(isValidSupabaseServiceRoleKey(realJwtShaped, publishableKey), true);
  });
  test("accepts a new-style sb_secret_ key distinct from the publishable key", () => {
    assert.equal(isValidSupabaseServiceRoleKey(realSecretShaped, publishableKey), true);
  });
  test("rejects REPLACE_ME even though it differs from the publishable key", () => {
    assert.equal(isValidSupabaseServiceRoleKey("REPLACE_ME", publishableKey), false);
  });
  test("rejects a value identical to the publishable key", () => {
    assert.equal(isValidSupabaseServiceRoleKey(publishableKey, publishableKey), false);
  });
  test("rejects an arbitrary non-placeholder string that isn't JWT- or sb_secret_-shaped", () => {
    assert.equal(
      isValidSupabaseServiceRoleKey("some-random-but-long-enough-string-value", publishableKey),
      false,
    );
  });
  test("rejects undefined", () => {
    assert.equal(isValidSupabaseServiceRoleKey(undefined, publishableKey), false);
  });
});

describe("resolveSupabaseAdminKey", () => {
  const publishableKey = "sb_publishable_FAKE_TEST_ONLY_0000000000000000";
  const realSecretShaped = "sb_secret_abcdefghijklmnopqrstuvwxyz0123456789";

  test("uses the service-role key when it is valid", () => {
    assert.equal(resolveSupabaseAdminKey(realSecretShaped, publishableKey), realSecretShaped);
  });
  test("falls back to the publishable key when the service-role key is a placeholder", () => {
    // This is the exact bug this fix addresses: SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME must not be
    // sent to Supabase — it must fall back to the publishable key, same as when it's unset.
    assert.equal(resolveSupabaseAdminKey("REPLACE_ME", publishableKey), publishableKey);
  });
  test("falls back to the publishable key when the service-role key is unset", () => {
    assert.equal(resolveSupabaseAdminKey(undefined, publishableKey), publishableKey);
  });
  test("falls back to the publishable key when the service-role key equals it", () => {
    assert.equal(resolveSupabaseAdminKey(publishableKey, publishableKey), publishableKey);
  });
});
