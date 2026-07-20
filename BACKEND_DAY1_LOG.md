# Backend Week 6, Day 1 — Project Setup

**Goal:** Set up the Express server skeleton, folder structure, and database
connection scaffolding (not yet connected to a live database — that's Day 2).

## What was built

```
virtualenvi-backend/
├── server.js           ← entry point, starts Express + connects DB
├── config/
│   └── db.js           ← Mongoose connection logic
├── models/
│   └── Contact.js       ← schema for form submissions (name, email, subject, message)
├── routes/
│   └── contact.js       ← POST /api/contact route with validation
├── .env.example         ← template for secrets (copy to .env, fill in real values)
├── .gitignore           ← keeps .env and node_modules out of GitHub
└── package.json
```

## Dependencies installed
- `express` — web server framework
- `mongoose` — MongoDB object modeling
- `dotenv` — loads `.env` variables into `process.env`
- `cors` — allows your front-end (different origin) to call this API
- `nodemon` (dev only) — auto-restarts server on file changes

## To run this locally
1. Copy `.env.example` to `.env`
2. Get a free MongoDB Atlas cluster (Day 2 will cover this in detail) and paste
   the connection string into `MONGODB_URI` in `.env`
3. `npm install`
4. `npm run dev` (uses nodemon) or `npm start`
5. Visit `http://localhost:5000` — should show `{"status": "Virtualenvi backend is running"}`

## What's already working
- `POST /api/contact` route exists and validates `name`/`email`/`message` are
  present, checks email format via the Mongoose schema, and returns clear
  JSON error messages instead of raw Mongoose errors
- 404 handler for unknown routes
- Server won't silently start if MongoDB connection fails — it logs the error
  and exits, so a broken DB connection is obvious immediately

## Known gap to fix before Week 6's front-end integration
Your `contact.html` form inputs currently have no `name` attribute (only
`placeholder`) — e.g. `<input type="text" placeholder="Full Name" required />`.
The backend expects `req.body.name`, `req.body.email`, etc., so you'll need to
add `name="name"`, `name="email"`, `name="subject"`, `name="message"` to the
four inputs before wiring up the real `fetch()` call. Flagging now so it's not
a surprise in Week 6 Day 3.

## Not done yet (upcoming days)
- Day 2: Live MongoDB Atlas connection + testing the schema actually saves data
- Day 3: Deeper validation/error handling edge cases
- Day 5: Testing the API standalone with Postman/Thunder Client
