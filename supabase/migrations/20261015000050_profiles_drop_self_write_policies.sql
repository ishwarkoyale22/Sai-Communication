-- REPOSITORY RECORD of a change that was made DIRECTLY on the live database (no migration was
-- recorded): the three "self-service" policies on public.profiles no longer exist there.
--   * "Users can create own profile"  (INSERT, check auth.uid() = id)
--   * "Users can update own profile"  (UPDATE, using/check auth.uid() = id)
--   * "Users can view own profile"    (SELECT, auth.uid() = id)   -- redundant: profiles_select already
--                                      allows own row or admin
-- Those first two were the admin-takeover hole: any signed-in user could set role = 'admin' on
-- their own row. With them gone only admins (profiles_admin_*) can write profiles, and
-- 20261015000000_profiles_role_guard.sql still blocks role changes by anyone else if such a
-- policy ever comes back.
-- Idempotent: where the policies are already gone this does nothing. It must run AFTER
-- 20261015000000_profiles_role_guard.sql, whose tests deliberately exercise the trigger while the
-- old policies are still present.
--
-- Rollback (re-opens the hole at the policy level; the trigger would still block role changes):
--   create policy "Users can create own profile" on public.profiles for insert to public
--     with check ((select auth.uid()) = id);
--   create policy "Users can update own profile" on public.profiles for update to public
--     using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
--   create policy "Users can view own profile" on public.profiles for select to public
--     using ((select auth.uid()) = id);

drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;

do $check$
begin
  if exists (select 1 from pg_catalog.pg_policies
              where schemaname = 'public' and tablename = 'profiles'
                and policyname in ('Users can create own profile', 'Users can update own profile')) then
    raise exception 'a self-service write policy is still present on profiles';
  end if;
end
$check$;