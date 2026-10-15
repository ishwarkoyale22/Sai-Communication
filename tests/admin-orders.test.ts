// Run with: npm test
// Admin order actions go through database functions (service_role cannot UPDATE website_orders).
// Mock-based: no network. Pins down input validation, the exact RPC contract, and that raw
// database error text never reaches the caller.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { updateOrderStatus, verifyAndMarkPaid } from "../src/lib/admin.server.ts";
import * as adminServer from "../src/lib/admin.server.ts";

type Call = { fn: string; args: Record<string, unknown> };

function mockDb(result: { error: { code?: string; message: string } | null } = { error: null }) {
  const calls: Call[] = [];
  const db = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return Promise.resolve({ data: null, ...result });
    },
  } as any;
  return { db, calls };
}

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
let logs: unknown[][] = [];
const origError = console.error;
beforeEach(() => {
  logs = [];
  console.error = (...a: unknown[]) => void logs.push(a);
});
afterEach(() => {
  console.error = origError;
});

describe("updateOrderStatus", () => {
  test("calls web_admin_set_order_status with only the id and status", async () => {
    const { db, calls } = mockDb();
    assert.deepEqual(await updateOrderStatus(ORDER_ID, "ready", db), { ok: true });
    assert.deepEqual(calls, [{ fn: "web_admin_set_order_status", args: { p_order_id: ORDER_ID, p_status: "ready" } }]);
  });

  test("rejects a status the database would not accept, without calling it", async () => {
    const { db, calls } = mockDb();
    await assert.rejects(() => updateOrderStatus(ORDER_ID, "paid; drop table", db), /Invalid order status/);
    await assert.rejects(() => updateOrderStatus(ORDER_ID, "collected", db), /Invalid order status/);
    assert.equal(calls.length, 0);
  });

  test("hides raw database text and logs only the code", async () => {
    const { db } = mockDb({ error: { code: "42501", message: 'permission denied for table "website_orders"' } });
    await assert.rejects(
      () => updateOrderStatus(ORDER_ID, "ready", db),
      (e: Error) => e.message === "Could not update the order status.",
    );
    assert.deepEqual(logs[0]?.slice(1), ["42501"]);
  });
});

describe("verifyAndMarkPaid", () => {
  test("calls web_admin_mark_order_paid and never sends a status or amount", async () => {
    const { db, calls } = mockDb();
    assert.deepEqual(await verifyAndMarkPaid(ORDER_ID, "cash", db), { ok: true });
    assert.deepEqual(calls, [
      { fn: "web_admin_mark_order_paid", args: { p_order_id: ORDER_ID, p_payment_method: "cash" } },
    ]);
  });

  test("rejects an unknown payment method, without calling the database", async () => {
    const { db, calls } = mockDb();
    await assert.rejects(() => verifyAndMarkPaid(ORDER_ID, "razorpay", db), /Invalid payment method/);
    assert.equal(calls.length, 0);
  });

  test("maps a database refusal (e.g. online order) to a generic message", async () => {
    const { db } = mockDb({ error: { code: "42501", message: "Online orders are settled by the payment gateway" } });
    await assert.rejects(
      () => verifyAndMarkPaid(ORDER_ID, "cash", db),
      (e: Error) => e.message === "Could not mark the order as paid.",
    );
  });
});

describe("forged-total surface", () => {
  test("admin.server no longer exports an order creator that trusts client totals", () => {
    assert.equal((adminServer as Record<string, unknown>)["createOrder"], undefined);
  });
});
