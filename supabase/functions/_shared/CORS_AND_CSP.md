# CORS allowlist (Edge Functions)

`ai-extract` and `create-staff` both get their CORS headers from [`cors.ts`](./cors.ts). Nothing in
either function's code names a domain — the allowlist lives entirely in the `ALLOWED_ORIGINS`
secret, read once at cold start.

## Configuring origins

```bash
# Production only:
supabase secrets set ALLOWED_ORIGINS="https://sai-communication.in"

# Production + www + a Vercel preview you're actively testing:
supabase secrets set ALLOWED_ORIGINS="https://sai-communication.in,https://www.sai-communication.in,https://sai-communication-git-feature-x.vercel.app"
```

- Comma-separated, exact origins (`scheme://host[:port]`, no path, no trailing slash, no wildcards).
- A literal `*` entry is silently dropped, not treated as "allow all" — see `parseAllowedOrigins` in
  `cors.ts`. If the secret is unset or empty, the allowlist is empty and **every** browser Origin is
  rejected (safe failure mode) — the functions still work for direct/server calls (no `Origin`
  header), but no browser page can call them until the secret is set.
- Only add a preview domain you actually control and are actively using to test these functions —
  each one is a URL that gets full CORS access to a bearer-token-authenticated call once a token
  leaks into it (XSS, extension, etc.). Remove it from the list again once you're done testing.

## Deploying a change

1. `supabase secrets set ALLOWED_ORIGINS="..."` — updates the secret for the whole project.
2. `supabase functions deploy ai-extract create-staff` — secrets are read at cold start, so each
   function must be redeployed (or will naturally cold-start again) to pick up the new value.
3. No `index.ts` edit required for either function.

## Testing

`cors.test.ts` covers the allowlist parser and header logic in isolation (run with
`deno test supabase/functions/_shared/cors.test.ts`): allowed origins are echoed back exactly,
unapproved/near-miss origins (wrong scheme, subdomain spoof, trailing slash) get no
`Access-Control-Allow-Origin` header at all, calls with no `Origin` header are unaffected, and an
unset/`*` secret never widens access.

To check it end-to-end against the deployed functions:

```bash
# Allowed origin -> should return Access-Control-Allow-Origin: https://sai-communication.in
curl -i -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: https://sai-communication.in" \
  -H "Access-Control-Request-Method: POST"

# Unapproved origin -> response has NO Access-Control-Allow-Origin header
curl -i -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST"
```

CORS is enforced by the *browser*, not the server: the second call above still returns 204 from the
function itself (OPTIONS is always answered), but a real browser won't let the page read the actual
POST response without a matching `Access-Control-Allow-Origin`. The function's own auth check
(`profiles.role === 'admin'`) is what actually stops a non-browser or CORS-bypassing caller — CORS
is defense in depth on top of that, never a replacement for it.

---

# CSP (`src/server.ts`) — what changes when you add a domain or integration

The CSP is currently `Content-Security-Policy-Report-Only` (observe, don't block) — see
[`src/server.ts`](../../src/server.ts). It is reviewed and updated **separately** from the CORS
allowlist above: CORS controls which browser *origins* may call the Edge Functions; CSP controls
which *external origins the website's own pages* may load from, connect to, or be framed by.

| You add/change...                                      | Directive(s) to update                          | Why |
|----------------------------------------------------------|--------------------------------------------------|-----|
| A new production/preview **domain for this site itself**  | None in CSP — CSP directives name third-party origins the page talks to, not the page's own origin (`'self'` already covers it). Update the CORS allowlist (above) instead if browser code on that domain needs to call the Edge Functions. | `'self'` is resolved per-request against whatever origin served the page. |
| A new **payment provider** (API calls from the browser)   | `connect-src`                                    | Browser `fetch`/XHR to a new host needs an explicit origin or it's blocked (enforced) / logged (report-only). |
| A new **payment provider's hosted checkout widget/iframe**| `frame-src`, and `script-src` if it injects a `<script src="...">` | A redirect to a hosted checkout page (full navigation) is NOT affected by CSP: only embedding it in an `<iframe>` is. |
| A new **font or stylesheet CDN**                          | `font-src` / `style-src`                         | Currently only Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`). |
| A new **analytics/ads script**                            | `script-src` (and `connect-src` for its beacon calls, `img-src` for pixel trackers) | None are present today — adding one is the most common way this policy breaks. |
| A new **image source** (product photos, admin uploads)    | `img-src` — currently `'self' data: https:`, intentionally broad | Tighten later to the specific Supabase storage host if you want stricter control. |
| A new **video embed provider** for `settings.owner_video_url`/`vijay_sir_video_url` | `frame-src` | This field is free text set by an admin; currently only `google.com`/`youtube.com`/`youtube-nocookie.com` are allowed. A Vimeo/Google-Drive link, etc. will show as a report-only violation until added. |
| Any **new inline `<script>` or inline event handler**     | `script-src` — ideally a hash/nonce instead of widening `'unsafe-inline'` further | Currently `'unsafe-inline'` only because of the two static inline scripts in `__root.tsx`; avoid adding more without revisiting that. |

**Before switching from Report-Only to enforcing:** check the browser DevTools Console on a real
preview/staging deploy of the exact production domain(s) for `[Report Only]` CSP violation lines —
especially after exercising checkout, the admin video-embed setting, and the contact-page map. Fix
or intentionally allow each one, then change the header name from
`Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `src/server.ts`.
