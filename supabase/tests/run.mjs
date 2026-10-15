// Migration + security test runner. Runs against a SCRATCH PostgreSQL 17 server (never a real project).
//
//   PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe" PGHOST=127.0.0.1 PGPORT=54329 node supabase/tests/run.mjs
//
// * Needs only the `psql` client and a scratch server where the superuser is named `postgres`
//   (the migrations treat `postgres` as the owner). No npm packages.
// * It creates and drops its own databases (sai_test_*), so it is safe to re-run.
// * Migrations are applied with `psql -1` (one transaction per file), like the Supabase migration runner.
import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIG = path.join(here, "..", "migrations");
const PSQL = process.env.PSQL ?? "psql";
const HOST = process.env.PGHOST ?? "127.0.0.1";
const PORT = process.env.PGPORT ?? "54329";
const baseArgs = (db) => ["-X", "-q", "-t", "-A", "-h", HOST, "-p", PORT, "-U", "postgres", "-w", "-d", db];

const M = {
  razorpay: "20261011020000_razorpay_payments.sql",
  rec1: "20261014124557_grant_service_role_payment_webhook_events.sql",
  rec2: "20261014171542_checkout_rpc_functions.sql",
  profilesGuard: "20261015000000_profiles_role_guard.sql",
  dropSelf: "20261015000050_profiles_drop_self_write_policies.sql",
  retire: "20261015000100_retire_old_payment_rpc.sql",
  lite: "20261015000200_website_orders_pending_only_insert.sql",
  full: "20261015000300_website_orders_service_role_only_insert.sql",
  dpdp: "20261011010000_dpdp_compliance.sql",
  dpdpHard: "20261015000400_dpdp_hardening.sql",
};
const readMig = (f) => readFileSync(path.join(MIG, f), "utf8");
const readTest = (f) => readFileSync(path.join(here, f), "utf8");
const VERBOSE = "\\set VERBOSITY verbose\n";

let passed = 0;
const failures = [];
const ok = (label) => { passed++; console.log(`  PASS  ${label}`); };
const bad = (label, why) => { failures.push(`${label}: ${why}`); console.log(`  FAIL  ${label}\n        ${String(why).split("\n").join("\n        ")}`); };

// One psql run. `single` = wrap in one transaction (-1). Stops at the first error.
function sql(db, text, { single = false } = {}) {
  const args = [...baseArgs(db), "-v", "ON_ERROR_STOP=1", ...(single ? ["-1"] : [])];
  const r = spawnSync(PSQL, args, { input: VERBOSE + text, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const err = r.stderr ?? "";
  const m = err.match(/ERROR:\s+([0-9A-Z]{5}):/);
  return { code: r.status, out: r.stdout ?? "", err, sqlstate: m ? m[1] : null };
}
const scalar = (db, q) => sql(db, q).out.trim();
const errText = (r) => (r.err.match(/ERROR:.*$/m)?.[0] ?? r.err).trim();

function freshDb(name, { helpers = true, migrations = [] } = {}) {
  let r = sql("postgres", `drop database if exists ${name} with (force);\ncreate database ${name};`);
  if (r.code !== 0) throw new Error(`cannot create ${name}: ${r.err}`);
  r = sql(name, readTest("fixture.sql"), { single: true });
  if (r.code !== 0) throw new Error(`fixture failed: ${errText(r)}`);
  if (helpers) { r = sql(name, readTest("helpers.sql"), { single: true }); if (r.code !== 0) throw new Error(`helpers failed: ${errText(r)}`); }
  for (const m of migrations) {
    r = sql(name, readMig(M[m]), { single: true });
    if (r.code !== 0) throw new Error(`prerequisite ${M[m]} failed: ${errText(r)}`);
  }
  return name;
}

function applyOk(db, key) {
  const r = sql(db, readMig(M[key]), { single: true });
  r.code === 0 ? ok(`apply ${M[key]}`) : bad(`apply ${M[key]}`, errText(r));
  return r.code === 0;
}
function expectApplyFails(db, key, label, sqlstate = "55000") {
  const r = sql(db, readMig(M[key]), { single: true });
  if (r.code === 0) bad(label, "migration unexpectedly succeeded");
  else r.sqlstate === sqlstate ? ok(label) : bad(label, `expected ${sqlstate}, got ${r.sqlstate}: ${errText(r)}`);
}

// Run every "-- @@ name [| isolation=...]" chunk of a test file in its own rolled-back transaction.
function runChunks(db, file) {
  console.log(`\n== ${file}`);
  const seed = readTest("seed.sql");
  const parts = readTest(file).split(/^-- @@ (.*)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const [name, opts] = parts[i].split("|").map((s) => s.trim());
    const iso = opts?.startsWith("isolation=") ? ` isolation level ${opts.slice("isolation=".length)}` : "";
    const r = sql(db, `begin${iso};\n${seed}\n${parts[i + 1]}\nrollback;\n`);
    const checks = (r.err.match(/PASS \[/g) ?? []).length;
    if (r.code !== 0) bad(`${file} :: ${name}`, errText(r));
    else if (checks === 0) bad(`${file} :: ${name}`, "chunk produced no assertions");
    else { passed += checks; console.log(`  PASS  ${name} (${checks} checks)`); }
  }
}

// ACL entries as a sorted list: after a rollback Postgres appends re-granted entries at the end of the
// array, so the raw text order differs although the privileges are identical.
const relacl = (db, table) =>
  scalar(db, `select relacl::text from pg_class where oid = '${table}'::regclass`).replace(/^\{|\}$/g, "").split(",").sort().join(",");
const rollbackLines = (file, re) => readMig(file).split(/\r?\n/).filter((l) => re.test(l)).map((l) => l.replace(/^--\s*/, ""));

// A long-lived psql session (for the two-session concurrency tests). Errors never stop it.
class Session {
  constructor(db) {
    this.n = 0; this.out = ""; this.err = ""; this.waiters = [];
    this.p = spawn(PSQL, baseArgs(db), { stdio: ["pipe", "pipe", "pipe"] });
    this.p.stdout.on("data", (d) => { this.out += d; this.check(); });
    this.p.stderr.on("data", (d) => { this.err += d; this.check(); });
    this.p.stdin.write(VERBOSE);
  }
  check() { for (const w of [...this.waiters]) if (this.out.includes(w.m) && this.err.includes(w.m)) { this.waiters.splice(this.waiters.indexOf(w), 1); w.r(); } }
  // Send SQL, resolve when psql has finished it; resolves {sqlstate, text} for any error it raised.
  run(text) {
    const m = `MARK${++this.n}`;
    this.out = ""; this.err = "";
    return new Promise((resolve) => {
      this.waiters.push({ m, r: () => {
        const e = this.err.match(/ERROR:\s+([0-9A-Z]{5}):\s*(.*)/);
        resolve({ sqlstate: e ? e[1] : null, text: e ? e[2] : "" });
      } });
      this.p.stdin.write(`${text}\n\\echo ${m}\n\\warn ${m}\n`);
    });
  }
  end() { this.p.stdin.end("\\q\n"); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const A1 = "a0000000-0000-0000-0000-000000000001", A2 = "a0000000-0000-0000-0000-000000000002", A3 = "a0000000-0000-0000-0000-000000000003";
const asRole = (s, role, uid) => s.run(`begin;\nselect set_config('request.jwt.claims', '{"sub":"${uid}","role":"${role}"}', true);\nset local role ${role};`);

function reseedAdmins(db, n) {
  const ids = [A1, A2, A3].slice(0, n);
  const r = sql(db, `truncate public.profiles; delete from auth.users;
    ${ids.map((i) => `insert into auth.users(id) values ('${i}');`).join("\n")}
    ${ids.map((i) => `insert into public.profiles(id, role) values ('${i}','admin');`).join("\n")}`);
  if (r.code !== 0) throw new Error(`reseed failed: ${errText(r)}`);
}
const rolesOf = (db) => scalar(db, "select string_agg(right(id::text,1) || ':' || role, ',' order by id) from public.profiles");

async function concurrency() {
  console.log("\n== concurrency (two real sessions)");
  const db = freshDb("sai_test_conc", { migrations: ["razorpay", "rec1", "rec2", "profilesGuard"] });
  const s1 = new Session(db), s2 = new Session(db);

  // 1. two admins demote each other at the same moment: exactly one may succeed
  reseedAdmins(db, 2);
  await asRole(s1, "authenticated", A2);
  await s1.run(`update public.profiles set role = 'staff' where id = '${A1}';`);
  await asRole(s2, "authenticated", A1);
  let waiting = true;
  const p2 = s2.run(`update public.profiles set role = 'staff' where id = '${A2}';`).then((r) => { waiting = false; return r; });
  await sleep(1000);
  waiting ? ok("second admin is made to WAIT while the first holds the lock") : bad("mutual demotion", "second session did not wait");
  await s1.run("commit;");
  const r2 = await p2;
  await s2.run("rollback;");
  ["42501", "23514"].includes(r2.sqlstate) ? ok(`second demotion is refused after the first commits (${r2.sqlstate})`) : bad("mutual demotion", r2.sqlstate ? `unexpected ${r2.sqlstate}: ${r2.text}` : "BOTH demotions succeeded");
  const a1 = rolesOf(db);
  a1 === "1:staff,2:admin" ? ok(`exactly one admin remains (${a1})`) : bad("mutual demotion end state", a1);

  // 2. stale admin: A is demoted by B while A's own request waits; A must not complete it
  reseedAdmins(db, 3);
  await asRole(s1, "authenticated", A2);
  await s1.run(`update public.profiles set role = 'staff' where id = '${A1}';`);
  await asRole(s2, "authenticated", A1);
  const p3 = s2.run(`update public.profiles set role = 'staff' where id = '${A3}';`);
  await sleep(800);
  await s1.run("commit;");
  const r3 = await p3;
  await s2.run("rollback;");
  r3.sqlstate === "42501" ? ok("a just-demoted admin cannot finish their in-flight demotion (42501)") : bad("stale admin", r3.sqlstate ? `${r3.sqlstate}: ${r3.text}` : "demotion by a no-longer-admin succeeded");
  const a2 = rolesOf(db);
  a2 === "1:staff,2:admin,3:admin" ? ok(`third admin untouched (${a2})`) : bad("stale admin end state", a2);

  // 3. the lock wait is bounded by statement_timeout
  reseedAdmins(db, 3);
  await asRole(s1, "authenticated", A2);
  await s1.run(`update public.profiles set role = 'staff' where id = '${A1}';`);
  await asRole(s2, "authenticated", A1);
  await s2.run("set local statement_timeout = '1500ms';");
  const t0 = Date.now();
  const r4 = await s2.run(`update public.profiles set role = 'staff' where id = '${A3}';`);
  const dt = Date.now() - t0;
  await s2.run("rollback;");
  await s1.run("rollback;");
  r4.sqlstate === "57014" && dt >= 1200 ? ok(`waiting session times out after ${dt}ms (57014)`) : bad("lock timeout", `${r4.sqlstate ?? "no error"} after ${dt}ms`);
  const a3 = rolesOf(db);
  a3 === "1:admin,2:admin,3:admin" ? ok("nothing changed after the timeout") : bad("timeout end state", a3);

  s1.end(); s2.end();
}

async function main() {
  // ---- main sequence: every migration in order, with its tests at the right point --------------
  console.log("== applying migrations in order on a live-like scratch schema");
  const db = freshDb("sai_test_main");
  for (const k of ["razorpay", "rec1", "rec2"]) applyOk(db, k);
  applyOk(db, "rec2"); // the repository record of the live migration must be harmless to re-run
  applyOk(db, "profilesGuard");
  runChunks(db, "profiles_role_guard.test.sql");
  applyOk(db, "dropSelf");
  applyOk(db, "dropSelf"); // idempotent: live already lacks these policies
  runChunks(db, "profiles_policies.test.sql");
  applyOk(db, "retire");
  runChunks(db, "payment_rpc.test.sql");
  applyOk(db, "lite");
  runChunks(db, "orders_rls_lite.test.sql");
  applyOk(db, "full");
  runChunks(db, "orders_rls_full.test.sql");
  applyOk(db, "dpdp");
  applyOk(db, "dpdpHard");
  runChunks(db, "dpdp.test.sql");

  // ---- ACL gates must refuse a database that differs from the reviewed baseline ----------------
  console.log("\n== pre-flight gates");
  let g = freshDb("sai_test_gate1", { helpers: false });
  sql(g, "grant select on public.profiles to anon with grant option");
  expectApplyFails(g, "profilesGuard", "C refuses a GRANT OPTION on profiles");
  scalar(g, "select count(*) from pg_trigger where tgname = 'profiles_role_guard'") === "0" ? ok("C left no trigger behind") : bad("C atomic", "trigger exists after failed gate");
  g = freshDb("sai_test_gate2", { helpers: false });
  sql(g, "revoke maintain on public.profiles from anon");
  expectApplyFails(g, "profilesGuard", "C refuses a missing MAINTAIN privilege (ACL differs)");
  g = freshDb("sai_test_gate3", { helpers: false });
  sql(g, "grant update (role) on public.profiles to service_role");
  expectApplyFails(g, "profilesGuard", "C refuses a column-level ACL");
  g = freshDb("sai_test_gate4", { helpers: false, migrations: ["profilesGuard"] });
  expectApplyFails(g, "profilesGuard", "C refuses to be applied twice");
  g = freshDb("sai_test_gate5", { helpers: false, migrations: ["razorpay", "rec2", "lite"] });
  sql(g, "grant delete on public.website_orders to service_role");
  expectApplyFails(g, "full", "final lock-down refuses an unexpected service_role privilege");

  // ---- rollbacks restore the recorded ACLs exactly ---------------------------------------------
  console.log("\n== rollback exactness");
  g = freshDb("sai_test_rb1", { helpers: false });
  const before = relacl(g, "public.profiles");
  let r = sql(g, readMig(M.profilesGuard), { single: true });
  r.code === 0 ? ok("apply C on the baseline") : bad("apply C on the baseline", errText(r));
  const rb = rollbackLines(M.profilesGuard, /^-- (drop trigger|drop function|grant) .*;$/);
  rb.length === 5 ? ok("found the 5 rollback statements in the file") : bad("rollback parse", `found ${rb.length}`);
  r = sql(g, rb.join("\n"), { single: true });
  r.code === 0 ? ok("rollback statements run cleanly") : bad("rollback run", errText(r));
  const afterRb = relacl(g, "public.profiles");
  afterRb === before ? ok("C rollback restores relacl exactly") : bad("C rollback", `before=${before} after=${afterRb}`);
  scalar(g, "select count(*) from pg_proc where proname = 'profiles_role_guard'") === "0" ? ok("C rollback removes the function") : bad("C rollback", "function remains");
  scalar(g, "select count(*) from pg_trigger where tgname like 'profiles_role_guard%'") === "0" ? ok("C rollback removes the triggers") : bad("C rollback", "trigger remains");

  g = freshDb("sai_test_rb2", { helpers: false, migrations: ["razorpay", "rec2", "lite"] });
  const bo = relacl(g, "public.website_orders"), bi = relacl(g, "public.website_order_items");
  r = sql(g, readMig(M.full), { single: true });
  r.code === 0 ? ok("apply final lock-down on the baseline") : bad("apply final lock-down", errText(r));
  const rb2 = rollbackLines(M.full, /^--\s+grant .* to (anon|authenticated);$/);
  rb2.length === 4 ? ok("found the 4 grant rollback statements in the file") : bad("full rollback parse", `found ${rb2.length}`);
  r = sql(g, rb2.join("\n"), { single: true });
  r.code === 0 ? ok("rollback grants run cleanly") : bad("full rollback run", errText(r));
  relacl(g, "public.website_orders") === bo ? ok("final lock-down rollback restores website_orders ACL exactly") : bad("full rollback orders", `${bo} vs ${relacl(g, "public.website_orders")}`);
  relacl(g, "public.website_order_items") === bi ? ok("final lock-down rollback restores website_order_items ACL exactly") : bad("full rollback items", `${bi} vs ${relacl(g, "public.website_order_items")}`);

  await concurrency();

  // ---- clean up scratch databases --------------------------------------------------------------
  for (const d of ["sai_test_main", "sai_test_conc", "sai_test_gate1", "sai_test_gate2", "sai_test_gate3", "sai_test_gate4", "sai_test_gate5", "sai_test_rb1", "sai_test_rb2"]) sql("postgres", `drop database if exists ${d} with (force);`);

  console.log(`\n${passed} checks passed, ${failures.length} failed`);
  if (failures.length) { console.log(failures.map((f) => " - " + f).join("\n")); process.exit(1); }
}

main().catch((e) => { console.error("RUNNER ERROR:", e); process.exit(2); });
