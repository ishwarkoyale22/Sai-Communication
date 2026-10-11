# Personal Data Breach Runbook (DPDP Act, 2023)

**[LEGAL REVIEW REQUIRED]** This runbook is a starting operational template, not legal advice.
Have a lawyer confirm the notification triggers, timelines and the Board notice format before
relying on this during a real incident.

## 1. What counts as a breach

Any unauthorised access, disclosure, acquisition, sharing, use, alteration, destruction or loss
of access to personal data we hold — e.g. a leaked database, a stolen staff laptop with customer
records, a misconfigured Supabase RLS policy exposing customer rows, or a phishing attack that
compromises an admin account.

## 2. Immediate steps (first 24 hours)

1. **Contain it.** Rotate the exposed credential/key, revoke the compromised session, disable the
   affected Supabase table's public access, or take the affected feature offline if needed.
2. **Preserve evidence.** Do not delete logs. Export relevant Supabase `query_logs`, auth logs,
   and the affected table's row counts/timestamps before making further changes.
3. **Identify scope.** Which table(s)? Which columns (e.g. `staff.pin`, `website_orders`,
   `consent_records`, `profiles`)? How many data principals (individuals) are affected? What
   categories of data (contact details, financial, device IMEI, PIN/password)?
4. **Assign an owner.** The Grievance Officer (see Privacy Policy footer) owns the response and
   is the single point of contact for the Board and affected users.

## 3. Notification timelines

**[LEGAL REVIEW]** The DPDP Act requires notifying the Data Protection Board of India "without
delay." As a working internal target:

- **Within 24 hours of discovery:** internal escalation to the Grievance Officer / founder.
- **Within 72 hours of discovery:** notify the Data Protection Board of India (see template below).
- **Without delay, alongside or shortly after the Board notice:** notify affected data principals
  individually (phone/email/WhatsApp — whichever we hold for them) using the template below.

## 4. Board Notice Template

> **To:** Data Protection Board of India
> **From:** [Grievance Officer name], Sai Communication
> **Date of discovery:** [date/time]
> **Date of this notice:** [date/time]
>
> **1. Nature of the breach:** [e.g. unauthorised read access to the `website_orders` table due
> to a misconfigured RLS policy]
>
> **2. Categories and approximate number of data principals affected:** [e.g. ~N customers;
> categories: name, phone, email, delivery address]
>
> **3. Categories of personal data involved:** [list exact columns/fields]
>
> **4. Likely consequences:** [e.g. risk of phishing/spam calls using leaked phone numbers]
>
> **5. Measures taken or proposed to mitigate:** [containment steps already taken, e.g. "RLS
> policy corrected at [time]; affected credential rotated at [time]"]
>
> **6. Point of contact:** [Grievance Officer name, phone, email]

## 5. User Notice Template

> Subject: Important notice about your data at Sai Communication
>
> Dear [Name],
>
> We are writing to let you know that on [date], we discovered [plain-language description of
> what happened — e.g. "a technical misconfiguration allowed unauthorised access to order
> records, which may have included your name, phone number and delivery address"].
>
> **What we have done:** [containment steps, e.g. "We fixed the issue within [X] hours of
> discovery and have no evidence the data was misused."]
>
> **What you can do:** [e.g. "Be alert to unexpected calls/messages claiming to be from Sai
> Communication asking for OTPs or payments — we will never ask for your password or OTP."]
>
> **Questions?** Contact our Grievance Officer: [name], [phone], [email].
>
> We take the protection of your data seriously and apologise for this incident.
>
> — Sai Communication

## 6. Post-incident

- Log the incident and resolution in `data_rights_requests` (request_type: `grievance`) or an
  internal incident log, whichever the admin portal supports at the time.
- Review and patch the root cause (see `DPDP_PROGRESS.md` for known open security gaps that could
  contribute to a breach — plaintext staff PIN storage, missing CAPTCHA, CSP/CORS gaps).
- Update this runbook with lessons learned.
