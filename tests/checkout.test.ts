// Run with: npm test
// Mock-based tests for placeWebsiteOrder's failure handling. No network, no real Supabase: the
// db client is injected. Covers: fail-closed without a real service-role key, infra errors NOT
// being reported as "no longer available", customer-safe messages (no raw DB text), and orphan
// order cleanup when the items insert fails.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { placeWebsiteOrder, CheckoutError } from "../src/lib/checkout.server.ts";

const ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;
const PUBLISHABLE = "sb_publishable_FAKE_TEST_ONLY_0000000000000000";
const SERVICE_ROLE = "sb_secret_abcdefghijklmnopqrstuvwxyz0123456789";
const RAW_DB_TEXT = 'new row violates row-level security policy for table "website_orders"';

let saved: Record<string, string | undefined> = {};
let logs: unknown[][] = [];
const origError = console.error;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env["SUPABASE_PUBLISHABLE_KEY"] = PUBLISHABLE;
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = SERVICE_ROLE;
  logs = [];
  console.error = (...a: unknown[]) => void logs.push(a);
});

afterEach(() => {
  console.error = origError;
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

type Result = { data?: unknown; error?: { code?: string; message: string } | null };
type Plan = Partial<Record<string, Result>>;

// Chainable stand-in for a PostgREST query builder. Filters are no-ops; awaiting or .single()
// resolves to the planned result for that table + operation.
function mockDb(plan: Plan) {
  const calls: { table: string; op: string }[] = [];
  const rpcCalls: { fn: string; args: any }[] = [];
  const db = {
    rpc(fn: string, args: any) {
      rpcCalls.push({ fn, args });
      return Promise.resolve(plan[`rpc.${fn}`] ?? { data: null, error: null });
    },
    from(table: string) {
      let op = "select";
      const result = () => {
        calls.push({ table, op });
        return Promise.resolve(plan[`${table}.${op}`] ?? { data: null, error: null });
      };
      const b: any = {
        select: () => b,
        eq: () => b,
        ilike: () => b,
        or: () => b,
        insert: () => ((op = "insert"), b),
        delete: () => ((op = "delete"), b),
        single: result,
        maybeSingle: result,
        then: (res: any, rej: any) => result().then(res, rej),
      };
      return b;
    },
  };
  return { db: db as any, calls, rpcCalls };
}

const input = {
  customer_name: "Test User",
  customer_phone: "9999999999",
  items: [{ item_type: "product" as const, inventory_id: "inv-1", quantity: 2 }],
};
const activeProduct: Result = { data: { name: "Cable", price: 100, is_active: true }, error: null };

async function messageOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof Error);
    return e.message;
  }
  assert.fail("expected placeWebsiteOrder to throw");
}

describe("placeWebsiteOrder: fail closed without a real service-role key", () => {
  for (const [label, value] of [
    ["unset", undefined],
    ["REPLACE_ME", "REPLACE_ME"],
    ["equal to the publishable key", PUBLISHABLE],
  ] as const) {
    test(`refuses before touching the database when the key is ${label}`, async () => {
      if (value === undefined) delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
      else process.env["SUPABASE_SERVICE_ROLE_KEY"] = value;
      const { db, calls } = mockDb({});
      await assert.rejects(placeWebsiteOrder(input, db), CheckoutError);
      assert.equal(calls.length, 0);
    });
  }
});

describe("placeWebsiteOrder: catalog lookup errors", () => {
  test("an auth/infra error is NOT reported as 'no longer available'", async () => {
    const { db } = mockDb({
      "inventory.select": { data: null, error: { code: "401", message: "Invalid API key" } },
    });
    const msg = await messageOf(placeWebsiteOrder(input, db));
    assert.doesNotMatch(msg, /no longer available/i);
    assert.doesNotMatch(msg, /Invalid API key/);
  });

  test("a genuinely missing product (PGRST116) still says 'no longer available'", async () => {
    const { db } = mockDb({
      "inventory.select": { data: null, error: { code: "PGRST116", message: "0 rows" } },
    });
    assert.match(await messageOf(placeWebsiteOrder(input, db)), /no longer available/i);
  });

  test("an inactive product says 'no longer available'", async () => {
    const { db } = mockDb({
      "inventory.select": { data: { name: "Cable", price: 100, is_active: false }, error: null },
    });
    assert.match(await messageOf(placeWebsiteOrder(input, db)), /"Cable" is no longer available/);
  });
});

describe("placeWebsiteOrder: atomic order creation", () => {
  test("order and items are sent to ONE database function, never inserted separately", async () => {
    const { db, calls, rpcCalls } = mockDb({
      "inventory.select": activeProduct,
      "rpc.web_place_order": { data: [{ id: "x" }], error: null },
    });
    const res = await placeWebsiteOrder({ ...input, items: [{ ...input.items[0]!, quantity: 3 }] }, db);
    assert.match(res.order_number, /^SC-\d{8}-\d{4}$/);
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0]!.fn, "web_place_order");
    assert.equal(rpcCalls[0]!.args.p_order.total_amount, 300); // recomputed from the catalog price
    assert.equal(rpcCalls[0]!.args.p_items.length, 1);
    assert.ok(!calls.some((c) => c.table.startsWith("website_order") ));
  });

  test("client-supplied prices are ignored: the catalog price is what gets stored", async () => {
    const { db, rpcCalls } = mockDb({ "inventory.select": activeProduct, "rpc.web_place_order": { error: null } });
    await placeWebsiteOrder({ ...input, items: [{ ...input.items[0]!, unit_price: 1, total_amount: 1 } as any] }, db);
    assert.equal(rpcCalls[0]!.args.p_items[0].unit_price, 100);
  });

  test("RPC failure (e.g. one item rejected) → safe message, raw DB text only in logs", async () => {
    const { db, calls } = mockDb({
      "inventory.select": activeProduct,
      "rpc.web_place_order": { error: { code: "23514", message: `Failing row contains (Test User, 9999999999)` } },
    });
    const msg = await messageOf(placeWebsiteOrder(input, db));
    assert.doesNotMatch(msg, /Failing row|9999999999|23514/);
    assert.ok(!logs.some((l) => l.join(" ").includes("9999999999")), "row data must not be logged");
    assert.ok(logs.some((l) => l.join(" ").includes("23514")));
    // No compensating best-effort deletes: atomicity is the database's job now.
    assert.ok(!calls.some((c) => c.op === "delete"));
  });

  test("RLS / permission error from the RPC is hidden from the customer", async () => {
    const { db } = mockDb({
      "inventory.select": activeProduct,
      "rpc.web_place_order": { error: { code: "42501", message: RAW_DB_TEXT } },
    });
    const msg = await messageOf(placeWebsiteOrder(input, db));
    assert.doesNotMatch(msg, /row-level security|website_orders/i);
  });

  test("a rejected order never reports success", async () => {
    const { db } = mockDb({ "inventory.select": activeProduct, "rpc.web_place_order": { error: { message: "boom" } } });
    await assert.rejects(placeWebsiteOrder(input, db), CheckoutError);
  });
});
describe("placeWebsiteOrder: order number collision", () => {
  test("retries once with a fresh order number when the unique number collides", async () => {
    let n = 0;
    const { db, rpcCalls } = mockDb({ "inventory.select": activeProduct });
    const realRpc = db.rpc;
    db.rpc = (fn: string, args: any) => {
      realRpc(fn, args);
      return Promise.resolve(++n === 1 ? { error: { code: "23505", message: "dup" } } : { error: null });
    };
    const res = await placeWebsiteOrder(input, db);
    assert.equal(rpcCalls.length, 2);
    assert.equal(res.order_number, rpcCalls[1]!.args.p_order.order_number);
  });

  test("gives up (safely) if the retry also fails", async () => {
    const { db, rpcCalls } = mockDb({
      "inventory.select": activeProduct,
      "rpc.web_place_order": { error: { code: "23505", message: "dup" } },
    });
    await assert.rejects(placeWebsiteOrder(input, db), CheckoutError);
    assert.equal(rpcCalls.length, 2);
  });
});