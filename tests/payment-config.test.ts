// Run with: npm test
// Covers isOnlinePaymentEnabled()/hasRealServiceRoleKey() — the switch that must stay OFF
// whenever Razorpay/Supabase config is missing or still templated (REPLACE_ME, the
// .env.example sample, etc.), and only turn ON for realistic-looking test/live credentials.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isOnlinePaymentEnabled, hasRealServiceRoleKey } from "../src/lib/payment.server.ts";

const ENV_KEYS = [
  "PAYMENT_PROVIDER",
  "VITE_PAYMENT_PROVIDER",
  "RAZORPAY_KEY_ID",
  "VITE_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

const REAL_PUBLISHABLE_KEY = "sb_publishable_FAKE_TEST_ONLY_0000000000000000";
const REAL_SERVICE_ROLE_KEY = "sb_secret_abcdefghijklmnopqrstuvwxyz0123456789";
const REAL_KEY_ID = "rzp_test_1DP5mmOlF5G5ag";
const REAL_KEY_SECRET = "8k2nF9pQmz7Lx4Rb1WvTgA6eYdC3sHu0";

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function setFullyValidConfig() {
  process.env["PAYMENT_PROVIDER"] = "razorpay";
  process.env["RAZORPAY_KEY_ID"] = REAL_KEY_ID;
  process.env["RAZORPAY_KEY_SECRET"] = REAL_KEY_SECRET;
  process.env["SUPABASE_PUBLISHABLE_KEY"] = REAL_PUBLISHABLE_KEY;
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = REAL_SERVICE_ROLE_KEY;
}

describe("isOnlinePaymentEnabled — valid configuration", () => {
  test("enables online payment when every value is realistic", () => {
    setFullyValidConfig();
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, true);
  });
});

describe("isOnlinePaymentEnabled — rejects placeholder/invalid configuration", () => {
  test("stays disabled with no config at all (default offline)", () => {
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });

  test("stays disabled when SUPABASE_SERVICE_ROLE_KEY is REPLACE_ME", () => {
    setFullyValidConfig();
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "REPLACE_ME";
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });

  test("stays disabled when SUPABASE_SERVICE_ROLE_KEY equals the publishable key", () => {
    setFullyValidConfig();
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = REAL_PUBLISHABLE_KEY;
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });

  test("stays disabled when RAZORPAY_KEY_ID is the .env.example sample", () => {
    setFullyValidConfig();
    process.env["RAZORPAY_KEY_ID"] = "rzp_test_xxxxxxxxxxxxxx";
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });

  test("stays disabled when RAZORPAY_KEY_ID is REPLACE_ME-prefixed", () => {
    setFullyValidConfig();
    process.env["RAZORPAY_KEY_ID"] = "REPLACE_ME_rzp_test_xxxxxxxxxxxxxx";
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });

  test("stays disabled when RAZORPAY_KEY_SECRET is REPLACE_ME", () => {
    setFullyValidConfig();
    process.env["RAZORPAY_KEY_SECRET"] = "REPLACE_ME";
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });

  test("stays disabled when provider is not razorpay", () => {
    setFullyValidConfig();
    process.env["PAYMENT_PROVIDER"] = "offline";
    assert.equal(isOnlinePaymentEnabled().onlineEnabled, false);
  });
});

describe("hasRealServiceRoleKey", () => {
  test("false when unset", () => {
    assert.equal(hasRealServiceRoleKey(), false);
  });
  test("false for a placeholder", () => {
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "REPLACE_ME";
    assert.equal(hasRealServiceRoleKey(), false);
  });
  test("true for a realistic, distinct service-role key", () => {
    process.env["SUPABASE_PUBLISHABLE_KEY"] = REAL_PUBLISHABLE_KEY;
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = REAL_SERVICE_ROLE_KEY;
    assert.equal(hasRealServiceRoleKey(), true);
  });
});
