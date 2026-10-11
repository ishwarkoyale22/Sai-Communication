-- DPDP Act (India) compliance: consent records and data-rights request intake.
-- See DPDP_PROGRESS.md at the repo root for the audit this migration implements.

-- Per-purpose, opt-in consent trail. One row per purpose per submission (not per user),
-- since most submitters here are unauthenticated customers identified only by phone/email.
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text,
  phone text,
  email text,
  purpose text not null check (purpose in (
    'account_creation',
    'order_processing',
    'repair_enquiry',
    'marketing_communications'
  )),
  granted boolean not null,
  policy_version text not null default '2026-10-11',
  source_page text not null
);

comment on table public.consent_records is
  'Opt-in/opt-out trail for DPDP Act Section 6 consent. Insert-only from the client; never update or infer consent from inaction.';

alter table public.consent_records enable row level security;

-- Anyone (including anonymous website visitors) may record their own consent choice.
-- No select/update/delete policy is defined for anon/authenticated — only staff via
-- the service role (admin portal) can read this table, since it is an audit trail.
create policy "anyone can insert their own consent record"
  on public.consent_records
  for insert
  to anon, authenticated
  with check (true);

-- Data Subject Rights requests: access / correction / erasure / consent withdrawal / nomination.
create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  email text,
  request_type text not null check (request_type in (
    'access',
    'correction',
    'erasure',
    'withdraw_consent',
    'nominate',
    'grievance'
  )),
  details text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'rejected')),
  resolved_at timestamptz,
  resolution_notes text
);

comment on table public.data_rights_requests is
  'Inbound DPDP data-subject-rights and grievance requests. Staff must acknowledge/resolve within the timelines in the Grievance Redressal section of the Privacy Policy.';

alter table public.data_rights_requests enable row level security;

create policy "anyone can submit a data rights request"
  on public.data_rights_requests
  for insert
  to anon, authenticated
  with check (true);

-- No anon/authenticated select policy: requests are triaged by staff via the service role
-- (admin portal), not visible to other customers or back to the submitter through the API.
