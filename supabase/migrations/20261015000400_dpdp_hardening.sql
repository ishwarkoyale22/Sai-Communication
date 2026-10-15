-- Hardening for the DPDP tables created by 20261011010000_dpdp_compliance.sql (consent_records,
-- data_rights_requests). That migration was never applied live (checkout logged
-- "Could not find the table 'public.consent_records'"); apply it FIRST, then this file.
--
-- It adds what the first file left to chance:
--   * explicit, least-privilege table grants (the first file relied on whatever default privileges
--     the project happens to have, and gave service_role nothing);
--   * admin-only read/triage policies, so the audit trail is actually readable by staff;
--   * length limits so the public insert endpoint cannot be used to dump arbitrary amounts of data
--     (data minimisation) - the tables hold only what the consent/request needs;
--   * a not-in-the-future timestamp guard.
-- Audit information kept per consent row: created_at (server clock), purpose, granted,
-- policy_version, source_page and the contact details the consent was given for. No IP address or
-- device fingerprint is stored.
--
-- Rollback (tables are new/empty; this only undoes the additions):
--   drop policy "admins read consent records" on public.consent_records;
--   drop policy "admins read data rights requests" on public.data_rights_requests;
--   drop policy "admins triage data rights requests" on public.data_rights_requests;
--   alter table public.consent_records drop constraint consent_records_field_lengths;
--   alter table public.consent_records drop constraint consent_records_not_future;
--   alter table public.data_rights_requests drop constraint data_rights_requests_field_lengths;
--   (grants: re-run the project's default privileges or revoke as needed)

-- Grants -----------------------------------------------------------------------------------
revoke all on public.consent_records from anon, authenticated;
grant insert on public.consent_records to anon, authenticated;
grant select on public.consent_records to authenticated;                 -- admins only, via policy
grant select, insert on public.consent_records to service_role;

revoke all on public.data_rights_requests from anon, authenticated;
grant insert on public.data_rights_requests to anon, authenticated;
grant select, update on public.data_rights_requests to authenticated;    -- admins only, via policies
grant select, insert, update on public.data_rights_requests to service_role;

-- Admin policies ---------------------------------------------------------------------------
drop policy if exists "admins read consent records" on public.consent_records;
create policy "admins read consent records"
  on public.consent_records for select to authenticated
  using (public.is_admin());

drop policy if exists "admins read data rights requests" on public.data_rights_requests;
create policy "admins read data rights requests"
  on public.data_rights_requests for select to authenticated
  using (public.is_admin());

drop policy if exists "admins triage data rights requests" on public.data_rights_requests;
create policy "admins triage data rights requests"
  on public.data_rights_requests for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Data minimisation / abuse limits ----------------------------------------------------------
alter table public.consent_records
  add constraint consent_records_field_lengths check (
    char_length(coalesce(full_name, '')) <= 200
    and char_length(coalesce(phone, '')) <= 20
    and char_length(coalesce(email, '')) <= 254
    and char_length(source_page) <= 100
    and char_length(policy_version) <= 30
  ),
  add constraint consent_records_not_future check (created_at <= now() + interval '5 minutes');

alter table public.data_rights_requests
  add constraint data_rights_requests_field_lengths check (
    char_length(full_name) <= 200
    and char_length(phone) <= 20
    and char_length(coalesce(email, '')) <= 254
    and char_length(coalesce(details, '')) <= 4000
    and char_length(coalesce(resolution_notes, '')) <= 4000
  );

do $check$
begin
  if pg_catalog.has_table_privilege('anon', 'public.consent_records', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.consent_records', 'UPDATE')
     or pg_catalog.has_table_privilege('anon', 'public.consent_records', 'DELETE') then
    raise exception 'anon has more than INSERT on consent_records';
  end if;
  if pg_catalog.has_table_privilege('anon', 'public.data_rights_requests', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.data_rights_requests', 'UPDATE') then
    raise exception 'anon has more than INSERT on data_rights_requests';
  end if;
end
$check$;
