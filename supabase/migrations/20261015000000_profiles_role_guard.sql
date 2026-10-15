-- Migration C: stop users from granting themselves a privileged role, and stop application paths
-- from removing the last admin.
-- STATUS: tested on a scratch PostgreSQL 17.11 server with supabase/tests/run.mjs (gate, rollback
-- exactness, 2-session concurrency, role scenarios). Applied to the live project only after those
-- tests passed; see supabase/MIGRATION_NOTES.md for the live version number and verification.
--
-- Problem (verified read-only on the live project, PostgreSQL 17.6):
--   * public.is_admin() is true when the caller's profiles row has role = 'admin'.
--   * profiles RLS lets any signed-in user INSERT/UPDATE their OWN row, and the policy only checks
--     `auth.uid() = id` — it says nothing about the role column.
--   * anon and authenticated both hold INSERT/UPDATE on profiles (including the role column), and
--     profiles has no trigger. So a customer login could set role = 'admin' on their own row and
--     then pass ~90 is_admin() policies (orders, payments, storage uploads, finance reports, ...).
--
-- Live facts this design relies on (checked read-only before writing):
--   * profiles columns: id (FK auth.users), role (CHECK in ('admin','staff'), default 'staff'),
--     created_at. 4 rows, all role = 'admin'. No other triggers on profiles or auth.users.
--   * The 'staff' role grants nothing in the database today: no public policy and no public
--     function calls is_staff() (only is_staff() itself). It is still guarded like a privileged
--     role because it is meant to be one.
--   * Only the create-staff edge function writes profiles with the service key, and only
--     { role: 'staff' } rows. ai-extract only reads. Customers use customer_profiles.
--
-- WHO MAY DO WHAT (the trigger below; evaluated with current_user, never with JWT claims):
--
--   caller                      INSERT            UPDATE                    DELETE         TRUNCATE
--   postgres, supabase_admin    anything          anything                  anything       allowed
--     ("break-glass": reachable only with the database password / platform; NOT used by the app)
--   service_role                role = 'staff'    id and role unchanged     staff rows     BLOCKED
--     only                                                                  only
--   signed-in admin             anything          id unchanged; cannot      cannot delete  BLOCKED
--                                                 demote the last admin     the last admin
--   everyone else               BLOCKED           id/role changes BLOCKED   BLOCKED        BLOCKED
--
-- service_role is HIGHLY PRIVILEGED: it bypasses RLS on every table, so anyone holding the service
-- key can already read or change nearly all data. This trigger therefore cannot make a leaked
-- service key harmless; it only guarantees that the key (and any app code using it) cannot create,
-- promote, demote or delete an ADMIN profile, so no ordinary application path can lock the business
-- out or mint an admin. Promoting an admin is done by an existing signed-in admin (RLS + trigger)
-- or by postgres in the SQL editor.
--
-- BREAK-GLASS RISK (accepted): postgres and supabase_admin bypass every check on purpose, so that
-- the business can always recover (re-create an admin, restore data, run maintenance). Anyone who
-- can act as one of them - the database password, the Supabase dashboard SQL editor / MCP / CLI
-- with owner rights, or a SECURITY DEFINER function owned by postgres - can create or remove
-- admins, demote the last admin, truncate profiles, and also DROP or DISABLE this trigger (the
-- table owner always can). Mitigations are operational, not in this file: keep the database password
-- and dashboard access to the owner only, never put postgres credentials in the app, edge functions
-- or CI logs, rotate the password after anyone with access leaves, restrict direct database access
-- (network restrictions), and review the project's audit/logs after any manual role change.
--
-- The trigger MUST stay SECURITY INVOKER: under SECURITY DEFINER, current_user would be the function
-- owner (postgres) for every caller and everybody would count as "break-glass".
--
-- PostgreSQL / Supabase assumptions (all Not yet verified by execution; see the test plan below):
--   A1  PostgreSQL 17.x (live project reports 17.6): BEFORE TRUNCATE ... FOR EACH STATEMENT,
--       EXECUTE FUNCTION, ALTER TABLE ... ENABLE ALWAYS TRIGGER, aclexplode(), hashtextextended()
--       and pg_advisory_xact_lock(bigint) all exist (PG 11+).
--   A2  PostgREST connects as `authenticator` and runs each request after SET LOCAL ROLE to anon /
--       authenticated / service_role, so current_user is the effective role (session_user is always
--       `authenticator` and is deliberately not used).
--   A3  An ordinary role cannot SET ROLE to postgres / supabase_admin / service_role, and
--       service_role is not the table owner (cannot disable the trigger).
--   A4  Requests run at READ COMMITTED (PostgREST default). In that mode every statement inside a
--       VOLATILE trigger function takes a fresh snapshot, so after waiting on the advisory lock the
--       "other admin" query sees what the lock holder committed. At REPEATABLE READ / SERIALIZABLE
--       the snapshot would be stale, so the trigger REFUSES admin demotion/deletion there (55000).
--   A5  Queries inside a volatile trigger function see rows already changed by the same outer
--       statement, which is what makes a single "demote/delete all admins" statement fail on the
--       last row. (Tested: when the rows are visited in the opposite order the guard raises 23514
--       on the last admin; in the forward order RLS re-evaluates is_admin() for the caller and
--       skips the remaining rows, so at least one admin survives either way.)
--   A6  TRUNCATE triggers also fire for tables truncated via CASCADE (e.g. TRUNCATE auth.users
--       CASCADE reaches profiles) and are statement-level only; their return value is ignored.
--   A7  Dashboard SQL editor, MCP execute_sql and `supabase db push` run as postgres.
--   A8  postgres is the owner of public.profiles on the live project (the gate checks that every
--       grant on the table was made by the owner; the rollback must be run by that same owner).
--   A9  REVOKE on a table also removes any COLUMN-level privileges of that role; the gate therefore
--       refuses to run if profiles has any column-level ACL (it could not be restored exactly).
--   A10 Statement/query timeouts (Supabase sets statement_timeout on anon/authenticated) bound how
--       long a session can wait for the advisory lock held by another session.
--   A11 The whole file runs as ONE transaction (all statements here are transactional DDL), so if
--       the gate or the post-conditions raise, nothing is applied. Run it as a single script, never
--       statement by statement.
--
-- ============================================================================================
-- PRE-FLIGHT GATE: the rollback at the bottom is only exact if the table ACL is the baseline that
-- was reviewed: anon and authenticated each hold exactly the 8 privileges below (the 7 classic ones
-- plus PostgreSQL 17's MAINTAIN), granted by the table owner, no GRANT OPTION. This baseline was
-- READ FROM THE LIVE DATABASE on 2026-10-15: relacl of public.profiles =
--   {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres}
-- (a=INSERT r=SELECT w=UPDATE d=DELETE D=TRUNCATE x=REFERENCES t=TRIGGER m=MAINTAIN).
-- Rather than assume it still holds, the migration aborts if the ACL differs. Nothing below runs
-- in that case.
-- ============================================================================================
do $gate$
declare
  v_expected constant text := 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE';
  v_anon     text;
  v_auth     text;
  v_odd      int;
  v_colacl   int;
begin
  -- Column-level ACLs would be revoked by the table-level REVOKE below and could not be restored by
  -- the table-level rollback grants.
  select count(*) into v_colacl
  from pg_catalog.pg_attribute att
  where att.attrelid = 'public.profiles'::regclass and att.attnum > 0
    and not att.attisdropped and att.attacl is not null;

  select string_agg(a.privilege_type, ',' order by a.privilege_type) into v_anon
  from pg_catalog.pg_class c
  cross join lateral pg_catalog.aclexplode(c.relacl) a
  join pg_catalog.pg_roles r on r.oid = a.grantee
  where c.oid = 'public.profiles'::regclass and r.rolname = 'anon';

  select string_agg(a.privilege_type, ',' order by a.privilege_type) into v_auth
  from pg_catalog.pg_class c
  cross join lateral pg_catalog.aclexplode(c.relacl) a
  join pg_catalog.pg_roles r on r.oid = a.grantee
  where c.oid = 'public.profiles'::regclass and r.rolname = 'authenticated';

  select count(*) into v_odd
  from pg_catalog.pg_class c
  cross join lateral pg_catalog.aclexplode(c.relacl) a
  join pg_catalog.pg_roles r on r.oid = a.grantee
  where c.oid = 'public.profiles'::regclass
    and r.rolname in ('anon', 'authenticated')
    and (a.is_grantable or a.grantor <> c.relowner);

  -- Do NOT weaken this gate to make it pass. If it aborts (for example because PostgreSQL 17's
  -- MAINTAIN privilege is present), record the real ACL (step 0 below), produce a reviewed variant of
  -- this file whose forward REVOKEs and rollback GRANTs include exactly those privileges, and
  -- re-review it.
  if v_anon is distinct from v_expected or v_auth is distinct from v_expected
     or v_odd <> 0 or v_colacl <> 0 then
    raise exception using
      errcode = '55000',
      message = format(
        'public.profiles ACL differs from the baseline reviewed for Migration C '
        '(anon=%s; authenticated=%s; grant-option-or-foreign-grantor entries=%s; '
        'column-level ACL entries=%s). The rollback would not restore it exactly - '
        'review before applying.',
        coalesce(v_anon, 'none'), coalesce(v_auth, 'none'), v_odd, v_colacl);
  end if;
end
$gate$;

-- ============================================================================================
-- The guard
-- ============================================================================================
create or replace function public.profiles_role_guard()
returns trigger
language plpgsql
security invoker            -- must stay INVOKER, see header
set search_path = ''        -- everything below is schema-qualified; pg_catalog is searched implicitly
as $$
declare
  v_admin boolean;
begin
  -- 1. Break-glass roles (database password / platform only; never used by application code).
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; end if;
    if tg_op = 'TRUNCATE' then return null; end if;
    return new;
  end if;

  if tg_op = 'TRUNCATE' then
    raise exception 'Not allowed to truncate profiles' using errcode = '42501';
  end if;

  -- 2. service_role: may only manage STAFF profiles. It can never create, promote, demote or
  --    delete an admin, so it cannot touch the last admin.
  if current_user = 'service_role' then
    if tg_op = 'INSERT' then
      if new.role is distinct from 'staff' then
        raise exception 'service_role may only create staff profiles' using errcode = '42501';
      end if;
      return new;
    elsif tg_op = 'UPDATE' then
      if new.id is distinct from old.id or new.role is distinct from old.role then
        raise exception 'service_role may not change profile ids or roles' using errcode = '42501';
      end if;
      return new;
    else  -- DELETE
      if old.role is distinct from 'staff' then
        raise exception 'service_role may only delete staff profiles' using errcode = '42501';
      end if;
      return old;
    end if;
  end if;

  -- 3. Everyone else (anon, authenticated, ...). is_admin() reads auth.uid() from the verified
  --    JWT; with no JWT it is false, so every unknown caller fails closed.
  v_admin := coalesce(public.is_admin(), false);

  if tg_op = 'INSERT' then
    if not v_admin then
      raise exception 'Not allowed to create profiles' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not v_admin then
      raise exception 'Not allowed to delete profiles' using errcode = '42501';
    end if;
    if old.role = 'admin' then
      if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
        raise exception 'Admin changes must run at READ COMMITTED' using errcode = '55000';
      end if;
      -- Serialise everything that can reduce the admin count, THEN re-read (see assumption A4).
      perform pg_advisory_xact_lock(hashtextextended('public.profiles:admin_count', 0));
      -- The caller may have been demoted while this session waited for the lock: re-check.
      if not coalesce(public.is_admin(), false) then
        raise exception 'Not allowed to delete profiles' using errcode = '42501';
      end if;
      if not exists (select 1 from public.profiles p where p.role = 'admin' and p.id <> old.id) then
        raise exception 'Cannot remove the last admin' using errcode = '23514';
      end if;
    end if;
    return old;
  end if;

  -- UPDATE
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed' using errcode = '42501';
  end if;

  if not v_admin then
    if new.role is distinct from old.role then
      raise exception 'Not allowed to change roles' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.role = 'admin' and new.role is distinct from 'admin' then
    if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
      raise exception 'Admin changes must run at READ COMMITTED' using errcode = '55000';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('public.profiles:admin_count', 0));
    -- The caller may have been demoted while this session waited for the lock: re-check.
    if not coalesce(public.is_admin(), false) then
      raise exception 'Not allowed to change roles' using errcode = '42501';
    end if;
    if not exists (select 1 from public.profiles p where p.role = 'admin' and p.id <> old.id) then
      raise exception 'Cannot remove the last admin' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

-- A trigger does not need the firing role to hold EXECUTE, so nobody gets it.
revoke all on function public.profiles_role_guard() from public, anon, authenticated;

drop trigger if exists profiles_role_guard_truncate on public.profiles;
drop trigger if exists profiles_role_guard on public.profiles;

create trigger profiles_role_guard
  before insert or update or delete on public.profiles
  for each row execute function public.profiles_role_guard();

-- TRUNCATE triggers must be FOR EACH STATEMENT; row triggers never fire for TRUNCATE.
create trigger profiles_role_guard_truncate
  before truncate on public.profiles
  for each statement execute function public.profiles_role_guard();

-- 'A' = fire always, even when session_replication_role = replica. Break-glass roles still pass.
alter table public.profiles enable always trigger profiles_role_guard;
alter table public.profiles enable always trigger profiles_role_guard_truncate;

-- Grant cleanup (defence in depth; the trigger is the real control).
--   * anon never needs profiles: every profiles policy depends on auth.uid().
--   * TRUNCATE ignores RLS; REFERENCES/TRIGGER/MAINTAIN are not needed by any client role.
--   * authenticated keeps SELECT/INSERT/UPDATE/DELETE so signed-in admins can still manage
--     profiles through the existing is_admin() policies.
revoke all on public.profiles from anon;
revoke truncate, trigger, references, maintain on public.profiles from authenticated;

-- Post-conditions: fail (and roll the migration back) if the result is not what was reviewed.
do $check$
begin
  if (select count(*) from pg_catalog.pg_trigger t
       where t.tgrelid = 'public.profiles'::regclass
         and t.tgname in ('profiles_role_guard', 'profiles_role_guard_truncate')
         and t.tgenabled = 'A') <> 2 then
    raise exception 'profiles_role_guard triggers are not both enabled ALWAYS';
  end if;
  if pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE') then
    raise exception 'profiles grants were not tightened as expected';
  end if;
end
$check$;

-- ============================================================================================
-- RE-APPLYING: the pre-flight gate intentionally fails on a second run (anon no longer holds the
-- baseline privileges). Roll back first, then re-apply.
--
-- ROLLBACK (exact; valid because the gate proved the baseline ACL before anything changed).
-- Run as the table OWNER (check step 0; assumption A8) so the grantor matches the original entries.
-- The statements below restore exactly what the forward REVOKEs removed: all 8 privileges for anon
-- (including MAINTAIN) and TRUNCATE/REFERENCES/TRIGGER/MAINTAIN for authenticated, with no GRANT
-- OPTION and nothing else. They are spelled out instead of `grant all` so that the result is
-- identical to the recorded baseline. If the gate ever aborts because the ACL differs, this
-- rollback is NOT valid for that database until a reviewed variant of the whole file exists.
-- ============================================================================================
-- drop trigger if exists profiles_role_guard_truncate on public.profiles;
-- drop trigger if exists profiles_role_guard on public.profiles;
-- drop function if exists public.profiles_role_guard();
-- grant select, insert, update, delete, truncate, references, trigger, maintain on public.profiles to anon;
-- grant truncate, references, trigger, maintain on public.profiles to authenticated;
--
-- Verify the rollback: pg_class.relacl for public.profiles must equal the value recorded in
-- step 0 below, character for character.
--
-- ============================================================================================
-- VALIDATION QUERIES (read-only). Run before AND after; expected AFTER values in comments.
-- ============================================================================================
-- 0. RECORD THE ORIGINAL ACL BEFORE APPLYING (keep the output with the change ticket):
--    select relowner::regrole, relacl from pg_class where oid = 'public.profiles'::regclass;
-- 1. Triggers present and ENABLE ALWAYS ('A'):
--    select tgname, tgenabled, tgtype from pg_trigger
--     where tgrelid = 'public.profiles'::regclass and not tgisinternal order by 1;
--    -- expect: profiles_role_guard | A ; profiles_role_guard_truncate | A
-- 2. Grants:
--    select grantee, privilege_type, is_grantable from information_schema.role_table_grants
--     where table_schema = 'public' and table_name = 'profiles' and grantee in ('anon','authenticated')
--     order by 1, 2;   -- expect: no anon rows; authenticated = DELETE, INSERT, SELECT, UPDATE
-- 3. Role distribution unchanged:   select role, count(*) from public.profiles group by role;
--    -- expect admin = 4
-- 4. Function not callable by clients:   select proname, proacl, prosecdef, proconfig
--    from pg_proc where proname = 'profiles_role_guard';
--    -- expect prosecdef = false, proconfig = {search_path=""}
--
-- ============================================================================================
-- TEST PLAN — every item is NOT YET VERIFIED (nothing has been executed). Run ONLY on a Supabase
-- branch or a local database with seeded users, never on production, each in BEGIN ... ROLLBACK.
-- Placeholders: :customer (auth user, no profiles row), :admin1/:admin2 (role admin),
--               :staff (role staff).
-- Impersonation pattern:
--   begin;  set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":":customer","role":"authenticated"}', true);
--   <statement>;  rollback;
--
--  #   caller               statement                                         expected
--  1   customer             insert profile (:customer, 'admin')               42501
--  2   customer             insert profile (:customer) -- default staff       42501
--  3   customer             upsert (:customer,'admin') on conflict update     42501
--  4   staff                update own role -> 'admin'                        42501
--  5   staff                update own created_at only                        succeeds
--  6   staff                update id -> :admin1                              42501
--  7   staff                delete own row / another row                      42501 (or 0 rows via RLS)
--  8   admin                insert profile (:customer,'staff')                succeeds
--  9   admin                promote :staff to 'admin'                         succeeds
-- 10   sole admin          demote self                                       23514
-- 11   admin (2 admins)     demote self                                       succeeds
-- 12   admin               delete the last admin / a non-last admin          23514 / succeeds
-- 13   admin (2 admins)     ONE statement demoting both                       2nd row fails: 42501 if the
--                                                                             caller was demoted by row 1,
--                                                                             else 23514 (A5); never both
-- 14   admin (2 admins)     ONE statement: delete from profiles where role='admin'   2nd row 42501/23514
-- 15   2 sessions, 2 admins each demotes the other concurrently               exactly one succeeds; the
--                                                                             other fails 42501 (it is no
--                                                                             longer admin) or 23514 (A4)
-- 16   admin               begin isolation level repeatable read; demote an admin   55000
-- 17   authenticated       truncate profiles (grant revoked)                  permission denied
-- 18   authenticated       same after re-granting TRUNCATE (trigger only)     42501
-- 19   anon                select * from profiles                            permission denied
-- 20   service_role        insert profile with role 'staff'                  succeeds
-- 21   service_role        insert profile with role 'admin'                  42501
-- 22   service_role        update any row's role (even staff -> staff no-op ok, staff -> admin)
--                                                                             no-op ok / change 42501
-- 23   service_role        update a non-role column                          succeeds
-- 24   service_role        delete a staff row / delete an admin row          succeeds / 42501
-- 25   service_role        truncate public.profiles                           42501
-- 26   postgres             insert admin; demote the last admin; truncate    all succeed (break-glass,
--                                                                             by design)
-- 27   supabase_admin      same as 26                                        succeed
-- 28   staff               select own row                                    works
-- 29   definer function owned by postgres updating a role                    succeeds (documents the
--                                                                             future-function rule)
-- 30   ACL gate            add a MAINTAIN grant (or GRANT OPTION) for anon on a branch, then
--                          apply                                              aborts 55000, nothing changed
-- 31   re-apply            apply twice                                        2nd run aborts at the gate
-- 32   rollback            apply, then run the rollback; compare relacl      identical to step 0 output
-- 33   app smoke           admin portal login + staff list + create-staff    works as before
-- 34   pre-login           phone login flow in a browser (anon lost profiles access)   works
-- 35   stale admin         3 admins A,B,C. Session 1 (as B) demotes A and holds its transaction
--                          open; session 2 (as A) demotes C and blocks on the advisory lock; session 1
--                          commits                                            session 2 fails 42501
-- 36   column ACL gate     on a scratch copy, GRANT UPDATE (role) ON profiles TO anon, then apply
--                                                                             aborts 55000
-- 37   cascade (A6)        scratch parent/child tables using the same trigger pattern; TRUNCATE
--                          parent CASCADE as a non-trusted role               trigger fires, 42501
-- 38   timeout (A10)       session 1 holds the lock; session 2 with statement_timeout = 2s tries to
--                          demote an admin                                    57014 after 2s, no change
--
-- ============================================================================================
-- EDGE CASES
-- ============================================================================================
-- * Break-glass roles (postgres, supabase_admin) can demote or delete the last admin, create admins,
--   truncate profiles, and drop or disable the trigger itself. That is deliberate: it is the
--   recovery path, and it is not reachable from any application path (see BREAK-GLASS RISK).
-- * A just-demoted admin whose request was already in flight is re-checked with is_admin() after the
--   advisory lock is acquired, so a stale "I was an admin a moment ago" cannot complete a demotion
--   or deletion.
-- * service_role cannot manage admins at all (promotion/demotion/deletion). Admin changes go through
--   a signed-in admin or the SQL editor.
-- * Row locks: the BEFORE ROW trigger holds the old row's lock while it waits for the advisory lock.
--   All callers take the single advisory lock first, so they cannot deadlock on it. A multi-row
--   statement can still deadlock on ROW locks against another multi-row statement in a different
--   order; Postgres aborts one of them (fail-safe).
-- * A SECURITY DEFINER function owned by postgres that writes profiles runs as break-glass and
--   bypasses the guard: such a function must do its own is_admin() check first.
-- * session_replication_role = replica no longer disables the guard (ENABLE ALWAYS); trusted
--   roles still pass, so restores run as postgres/supabase_admin are unaffected.
-- * The last-admin query runs as the invoking admin under RLS and relies on profiles_select letting
--   an admin see all rows. If that policy changes, the check would undercount admins.
-- * profiles.staff_id (used by the repo's create-staff function) does not exist on the live table;
--   that pre-existing mismatch is untouched, and create-staff already fails at that insert today.
-- * Revoking anon access assumes no pre-login screen reads profiles directly (the only pre-login
--   lookup found is the SECURITY DEFINER get_email_by_phone()). Not yet tested in a browser.
