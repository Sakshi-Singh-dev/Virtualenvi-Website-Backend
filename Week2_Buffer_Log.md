# Week 2, Day 7 — Buffer / Catch-Up

**Goal:** No new features — audit the full Week 2 build (Nodemailer + real
front-end integration, Days 1-6) for bugs and gaps before Week 3, and confirm
what still needs a manual pass with real credentials.

## What was audited
- `routes/contact.js` — validation logic, response shapes
- `utils/mailer.js` — Nodemailer wiring, failure isolation from the DB save
- `models/Contact.js` — schema limits vs. route-level validation limits
- `middleware/errorHandler.js`, `middleware/requestLogger.js` — unchanged
  since Week 1, re-checked for drift
- `script.js` (`submitForm()`) — real `fetch()` call, `AbortController`
  timeout, success/error UI state handling
- `contact.html` — form field `name` attributes, success/error message
  markup and `aria-live` regions
- `package.json`, `.env.example` — dependency and config completeness

## Automated edge-case verification
Built `edge_case_test.js` — mounts the real `contact` router with a mocked
`Contact.create` (so no live Atlas connection is needed) and fires 15 body
variations plus malformed-JSON, missing-content-type, and unknown-route
cases through it via supertest. Every case returned the expected status
and message on the first run:

| Case | Expected | Got |
|---|---|---|
| Valid submission | 201 | ✅ 201 |
| Whitespace-only name | 400, "Name is required." | ✅ |
| Missing name field | 400, "Name is required." | ✅ |
| Name > 100 chars | 400 | ✅ |
| Malformed email (3 variants) | 400 | ✅ all three |
| Empty email | 400 | ✅ |
| Subject > 150 chars | 400 | ✅ |
| Whitespace-only message | 400 | ✅ |
| Message > 2000 chars | 400 | ✅ |
| Message exactly 2000 chars (boundary) | 201 | ✅ |
| Non-string `name` (number) | 400 | ✅ |
| Extra unexpected field | 201, field ignored | ✅ |
| Empty body `{}` | 400 | ✅ |
| Malformed JSON | 400, "Request body must be valid JSON." | ✅ |
| No Content-Type / raw string body | 400 | ✅ |
| Unknown route | 404 | ✅ |

No failures — the Day 4 validation logic and the Week 1 malformed-JSON fix
both hold up under this batch. Keep `edge_case_test.js` around; rerun it
with `node edge_case_test.js` any time the route changes.

## Issues found and fixed
None this round — Day 4-6 work was already in good shape by the time this
audit ran.

## Confirmed OK (no changes needed)
- `sendContactNotification` / `sendConfirmationEmail` are fire-and-forget:
  a missing `.env` email config or a failed send only logs a `[WARN]`/
  `[ERROR]`, it never fails the contact submission itself
- User-submitted text is HTML-escaped before going into the email body
  (prevents HTML/script injection into the notification email)
- `script.js`'s `submitForm()` has a 10s `AbortController` timeout, so a
  hung/unreachable server can't leave the button stuck on "Sending…"
  forever
- Error branch distinguishes a timeout (`AbortError`) from a normal
  server-returned error message, and shows a different message for each
- `contact.html` has `name` attributes on all 4 inputs, and both message
  regions use `aria-live` so screen readers announce success/failure
- Schema limits (`models/Contact.js`) still match the route's manual
  validation limits exactly — no drift

## Manual pass (Day 5 + Day 6) — confirmed complete
The sandbox this audit ran in has no network access to MongoDB Atlas or
Gmail's SMTP servers, so these two items needed a manual pass with real
credentials — done and confirmed:

1. **Day 5 — true end-to-end local test.** Live run with real
   `MONGODB_URI` and `EMAIL_USER`/`EMAIL_PASS`: form submission saved to
   Atlas, notification email and confirmation email both arrived.
2. **Day 6 — real-world edge cases.** Server-down, throttled-connection,
   and real-device scenarios tested against the live form.

Week 2 (Nodemailer + real front-end integration) is fully closed.

## Not touched
No new routes, fields, or UI states were added — Day 7 is cleanup and
verification only. Week 3 starts fresh next.
