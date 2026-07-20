# Backend Week 6, Day 7 — Buffer / Review

**Goal:** No new features — audit the full Week 6 backend (Days 1-6) for bugs
and gaps before moving into Week 7.

## What was audited
- `routes/contact.js` — validation logic, error handling flow
- `models/Contact.js` — schema consistency with route-level validation
- `middleware/errorHandler.js` — behavior under different error types
- `middleware/requestLogger.js` — logging correctness
- `server.js` — middleware order
- `config/db.js`, `utils/logger.js` — consistency
- `package.json`, `.env.example`, `.gitignore` — completeness

## Issue found and fixed

**Malformed JSON body was misreported as a 500 server error.**
If a client sends a request with syntactically invalid JSON in the body
(e.g. a trailing comma, unescaped quote), Express's `express.json()`
middleware throws an error with `err.type === 'entity.parse.failed'`. This
is a *client* mistake — the equivalent of a typo — but the centralized
error handler was treating it identically to a genuine server crash,
returning `500` with "Something went wrong on our end."

Fixed in `middleware/errorHandler.js`: this error type is now caught
specifically and returns `400` with a clear message ("Request body must be
valid JSON."), logged as a `[WARN]` instead of an `[ERROR]` — matching how
every other client-input mistake is already handled in `routes/contact.js`.

## Confirmed OK (no changes needed)
- Schema (`models/Contact.js`) limits match the route's manual validation
  limits exactly (name 100, subject 150, message 2000) — no drift between
  the two validation layers
- Middleware order in `server.js` is correct: body parsers → request logger
  → routes → 404 handler → error handler (must always be last)
- `.gitignore` correctly excludes `.env`, `node_modules/`, and `logs/`
- `.env.example` has no real secrets, just placeholders and comments
- `package.json` scripts (`start`, `dev`) both point to the right entry file

## Not touched
No new validation rules, routes, or features were added — Day 7 is cleanup
only. Week 6 (Nodemailer + real front-end integration) starts fresh next.
