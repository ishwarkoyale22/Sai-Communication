# DPDP Act (India) Compliance — Audit & Build Log

Branch: `compliance/dpdp`. Not pushed — local only per task instructions.
Audit date: 2026-10-11.

## 1. Personal data inventory (found)

| Collection point | File | Data | Stored to |
|---|---|---|---|
| Signup | `src/components/auth/AuthDialog.tsx` | full name, phone, email, password | Supabase Auth + `profiles` |
| Login / password reset | `src/components/auth/AuthDialog.tsx` | email/phone, password | Supabase Auth |
| Checkout | `src/routes/checkout.tsx` | name, phone, email, address, DOB | `website_orders` (address folded into `notes` — no dedicated column) |
| Enquiry form | `src/components/EnquiryDialog.tsx` | name, phone, email, message | `enquiries` |
| Repair enquiry | `src/components/RepairEnquiryForm.tsx` | name, phone, device details | (table not yet re-verified post-audit — check before next release) |
| Reviews | `src/components/ReviewForm.tsx` | reviewer name, text | reviews table |
| Staff creation (admin only) | `supabase/functions/create-staff/index.ts` | name, phone, 4-digit PIN | `staff` table + Supabase Auth |
| Account page | `src/routes/account.tsx` | profile view/edit | `profiles` |

## 2. Third-party services / trackers (found)

- **Google Fonts** (`src/routes/__root.tsx`) — external font CDN, no tracking cookie, essential-ish.
- **Razorpay** (`src/lib/payment/razorpay-provider.ts`) and **Cashfree** (referenced in CSP
  allowlist in `src/server.ts`) — payment gateways, functionally necessary for checkout.
- **No analytics or ad trackers found** (no GA/Meta Pixel/Hotjar/Mixpanel/Sentry/PostHog/Maps).
  **Decision:** since nothing non-essential currently loads, a consent-gated loader for future
  trackers was built (`src/components/privacy/ConsentBanner.tsx`) rather than retrofitting a
  banner with nothing to gate. Wire any future analytics/ads script behind
  `getTrackerConsent() === "accepted"` from `src/components/privacy/ConsentBanner.tsx`.

## 3. What was built

- **Privacy Notice** (`src/routes/privacy-policy.tsx`) — added Data Retention, expanded Data
  Principal Rights (access/correction/erasure/withdraw consent/nominate), and Grievance
  Redressal sections. Marked `[LEGAL REVIEW]` inline where retention periods and the Grievance
  Officer designation need a lawyer's sign-off. Linked a Data Rights Request CTA.
- **Opt-in consent checkboxes** (unticked by default, per purpose) added at:
  - Signup (`AuthDialog.tsx`) — required Terms+Privacy consent, optional marketing consent.
  - Checkout (`checkout.tsx`) — required order-processing consent, optional marketing consent.
  - Enquiry form (`EnquiryDialog.tsx`) — required data-use consent, optional marketing consent.
  - Shared UI: `src/components/privacy/ConsentCheckbox.tsx`.
- **Consent storage** — new `consent_records` table (migration
  `supabase/migrations/20261011010000_dpdp_compliance.sql`), written via
  `src/lib/consent.ts::recordConsent()`. Insert-only from the client; staff read via service role
  only (admin portal, not yet built — see Open Items).
- **Non-essential tracker gate** — `src/components/privacy/ConsentBanner.tsx`, mounted globally in
  `src/routes/__root.tsx`. Currently nothing is gated behind it (see §2) but the mechanism exists.
- **Grievance contact** — added to `src/components/SiteFooter.tsx` (every page) and the Privacy
  Policy's new Grievance Redressal section. **[LEGAL REVIEW]** officer name is a placeholder
  ("Vijay Sir") — confirm the actual designated Grievance Officer and publish a real email
  address (currently falls back to the general contact email via `settings["grievance_email"]`,
  which does not yet exist as a configured setting — add it in the admin settings panel).
- **Data Rights Request form** — new route `src/routes/data-rights-request.tsx`, writes to new
  `data_rights_requests` table (same migration as above). Covers access / correction / erasure /
  withdraw consent / nominate / grievance.
- **Terms & Conditions** — added a "Data Protection" clause (`src/routes/terms-and-conditions.tsx`)
  cross-referencing the Privacy Policy, consent withdrawal, and breach notification.
- **Breach runbook** — `BREACH_RUNBOOK.md` at repo root: 72-hour Board notice flow, Board notice
  template, and user notice template. **[LEGAL REVIEW]** required before relying on it in a real
  incident — the exact DPDP breach-notification trigger and timeline need legal confirmation.

## 4. What needs lawyer review before this is relied on

- Data retention periods in the Privacy Policy's new "Data Retention" section (3 years / 8 years
  / 30 days are placeholders based on common Indian GST/consumer-law practice, not confirmed).
- Whether order-processing and account-creation count as DPDP "consent" or a different lawful
  basis (contract performance / legitimate use) — affects whether those checkboxes should be
  framed as consent at all versus a notice-only disclosure.
- The Grievance Officer designation (name/contact) in the footer and Privacy Policy is a
  placeholder and must be formally appointed per DPDP Act requirements.
- `BREACH_RUNBOOK.md` notification timelines and templates.
- Whether staff (employees), who are also data principals for the `staff.pin`/`staff.phone` data,
  need their own consent/notice flow — not addressed in this pass (out of scope: internal HR data,
  not customer-facing).

## 5. Security gaps flagged (not fixed in this pass — flagging only, per task scope)

- **Plaintext PIN storage** — `supabase/functions/create-staff/index.ts:65` stores the staff's
  4-digit PIN as cleartext in the `staff.pin` column in addition to using it as the Supabase Auth
  password. Anyone with database/table read access (e.g. a future RLS misconfiguration, or an
  admin-portal bug) sees the plaintext PIN. This is itself a DPDP "reasonable security safeguards"
  gap (Section 8(5)) and should be remediated (hash the PIN, or drop the column and verify against
  Supabase Auth only) — tracked here, not fixed in this branch.
- **CSP is Report-Only, not enforcing** — `src/server.ts:78` sets
  `Content-Security-Policy-Report-Only` rather than `Content-Security-Policy`. It is observing
  violations but not blocking anything. Should be flipped to enforcing once violation reports are
  clean.
- **No CAPTCHA anywhere** — signup, login, enquiry, checkout and the new Data Rights Request form
  are all unprotected against automated/bot submission. Relevant to DPDP in that bot-submitted
  rows (fake consent records, spam data-rights requests) pollute compliance records and could be
  used to flood the Grievance Officer. Not implemented in this pass — flagging only.
- **No rate limiting observed** on public insert endpoints (`enquiries`, `website_orders`,
  `consent_records`, `data_rights_requests` all accept anonymous inserts per their RLS policies).
  Combined with no CAPTCHA, this is a spam/DoS-adjacent exposure worth a follow-up.
- Previously flagged in memory and still open as of this audit: CORS allowlist correctness and
  the fail-open encryption path noted in an earlier security pass were not re-verified in this
  DPDP-focused pass — re-check against `security-review` skill output before shipping.

## 6. Open items / follow-ups

- No admin-portal UI was built to browse `consent_records` or triage `data_rights_requests` —
  staff currently have no way to action these except direct database/SQL access via the service
  role. This should be the next build: an admin page listing open `data_rights_requests` with a
  status/resolution workflow, and a read view of `consent_records` for audit purposes.
- `settings["grievance_officer_name"]` / `settings["grievance_email"]` are referenced in
  `SiteFooter.tsx` and fall back to existing `phone`/`email` settings — add these as real,
  separately configurable settings once the Grievance Officer is formally appointed.
- `RepairEnquiryForm.tsx` was identified in the initial data inventory but not patched with a
  consent checkbox in this pass (time-boxed to the three highest-traffic entry points: signup,
  checkout, enquiry). Add the same `ConsentCheckbox` pattern there next.
- `ReviewForm.tsx` collects a reviewer name/text publicly displayed — consider whether a
  lightweight consent/notice is needed given the data is published, not just stored.
- Migration not yet applied to any Supabase project (local file only) — run
  `supabase migration up` / push via the Supabase MCP tooling against the target project before
  this reaches production.
