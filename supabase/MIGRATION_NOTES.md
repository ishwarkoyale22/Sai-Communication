# Migration notes (read before touching the database)

**Never run `supabase db push` here.** The live migration history and this folder do not line up (see below).
The files are the reviewed source of truth for *what* was applied; the live history records *when*.

## How the migrations were tested
`supabase/tests/run.mjs` applies every migration, in order, to a scratch PostgreSQL 17 server that imitates the
live schema (`fixture.sql` was read back from the live database), then runs the SQL tests, the ACL gates, the
rollback-exactness checks and a two-session concurrency test. It never touches a real project.

```
PSQL="<path>\psql.exe" PGHOST=127.0.0.1 PGPORT=54329 node supabase/tests/run.mjs
```
Last run: 187 checks passed, 0 failed (PostgreSQL 17.11, scratch cluster).

## Live status (checked 2026-10-15, re-checked after the DPDP apply)
| Repo file | Live history entry | State |
|---|---|---|
| `20261014124557_grant_service_role_payment_webhook_events.sql` | `20261014124557` | applied earlier by hand; this file is only the record |
| `20261014171542_checkout_rpc_functions.sql` | `20261014171542` | applied earlier by hand; this file is only the record |
| `20261015000000_profiles_role_guard.sql` (C) | `profiles_role_guard` | **applied** |
| `20261015000050_profiles_drop_self_write_policies.sql` | not recorded | the policies were already gone (removed directly); **not applied via a migration** |
| `20261015000100_retire_old_payment_rpc.sql` | `retire_old_payment_rpc` | **applied** |
| `20261015000200_website_orders_pending_only_insert.sql` | `website_orders_pending_only_insert` | **applied** |
| `20261011010000_dpdp_compliance.sql` | `20261015101946 dpdp_compliance` | **applied 2026-10-15** (via the Supabase migration tool, same statements as the file; the live version differs from the file's timestamp, as with the other rows). Verified read-only afterwards: both tables exist, RLS on, anon has INSERT only. |
| `20261015000400_dpdp_hardening.sql` | `20261015102007 dpdp_hardening` | **applied 2026-10-15** right after the file above (same statements). Rollback is in the file header; the tables were empty when it ran. The scratch-DB test runner (`tests/run.mjs`) was NOT re-run for this apply (no local PostgreSQL). |
| `20261015000300_website_orders_service_role_only_insert.sql` | - | **HOLD**: apply only after every deployed storefront build places orders through the server (see the file header) |

## Known mismatches between this folder and the live history
* Live has versions assigned when each statement was applied (for example `20261014103034 grant_service_role_checkout_tables`,
  `20261014103941 razorpay_payments`); the repo files carry different timestamps
  (`20261014010000_grant_service_role_checkout_tables.sql`, `20261011020000_razorpay_payments.sql`). The *content* is equivalent.
* The repo has files that were never applied live (`restore_checkout_insert`, `seed_complete_demo_data`).
  `20261013000000_restore_checkout_insert.sql` uses `create policy if not exists`, which PostgreSQL does not support; do not apply it.
* Live has about 25 entries (notifications, staff, finance, ...) that have no file here.

## Rollbacks
Each migration carries its exact rollback in its header. The ACL-changing ones (C and the final lock-down) refuse to run unless the
table ACLs equal the baseline read from live, so their rollbacks restore the ACL exactly (verified by `run.mjs`).

## Pre-change snapshot
Taken before applying on 2026-10-15 (ACLs, policies, functions, history). These migrations change schema objects only, not rows.

## Open items (2026-10-15, updated)
* `20261015120000_admin_order_rpcs.sql` (admin order-status / manual mark-paid functions, service_role only): **written, NOT applied
  live** - the migration tool refused it. Until it is applied the admin portal's order-status and mark-paid actions fail
  (service_role has no UPDATE on `website_orders`). Rollback is in the file header.
* **Lock-down (`...000300`) still on HOLD** - the production build/key could not be verified (Vercel access refused). The repo
  no longer contains the unauthenticated `publicCreateOrder` server function (it trusted client totals and would have bypassed
  the lock-down); production keeps it until redeployed.
* Order `SC-20261014-4410`: Razorpay confirms payment `captured`, INR 29,999, matching order id; its `order_status` was set
  `pending` -> `confirmed` on 2026-10-15 (that one column only; payment fields untouched). Cause of the earlier `pending` unknown.
* Test order `SC-20261015-6835` (pending, no payment) left untouched.
