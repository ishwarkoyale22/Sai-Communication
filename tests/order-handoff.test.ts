// Run with: npm test
// The customer's phone number is handed from checkout to the order pages through sessionStorage,
// never through the URL. These tests pin down that behaviour and its failure modes.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rememberOrderPhone, recallOrderPhone } from "../src/lib/order-handoff.ts";

function installStorage(impl?: Partial<Storage>) {
  const data = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    ...impl,
  };
  return data;
}

describe("order phone handoff", () => {
  beforeEach(() => installStorage());

  test("recalls the phone for the order it was saved for", () => {
    rememberOrderPhone("SC-1", "9000000001");
    assert.equal(recallOrderPhone("SC-1"), "9000000001");
  });

  test("does not leak the phone to a different order number", () => {
    rememberOrderPhone("SC-1", "9000000001");
    assert.equal(recallOrderPhone("SC-2"), "");
  });

  test("nothing saved -> empty string", () => {
    assert.equal(recallOrderPhone("SC-1"), "");
  });

  test("corrupted storage content is ignored", () => {
    const data = installStorage();
    data.set("sai:last-order", "{not json");
    assert.equal(recallOrderPhone("SC-1"), "");
    data.set("sai:last-order", JSON.stringify({ orderNumber: "SC-1", phone: 123 }));
    assert.equal(recallOrderPhone("SC-1"), "");
  });

  test("unavailable storage (private mode / blocked) never throws", () => {
    installStorage({
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    });
    assert.doesNotThrow(() => rememberOrderPhone("SC-1", "9000000001"));
    assert.equal(recallOrderPhone("SC-1"), "");
  });

  test("no sessionStorage at all (server render) never throws", () => {
    delete (globalThis as any).sessionStorage;
    assert.doesNotThrow(() => rememberOrderPhone("SC-1", "9000000001"));
    assert.equal(recallOrderPhone("SC-1"), "");
  });
});
