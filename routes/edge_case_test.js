// Day 7 buffer — edge case verification harness.
// Mounts the REAL contact router with a mocked Contact.create (no live
// MongoDB needed) so we can fire a batch of edge-case requests and confirm
// the Day 4 validation logic behaves as expected, without needing a live
// Atlas cluster or email credentials in this environment.

const express = require('express');
const request = require('supertest');
const Contact = require('./models/Contact');

// Mock the DB layer only — everything else (validation, error handler,
// mailer no-op path) runs for real.
Contact.create = async (data) => ({ _id: 'mock_id_123', ...data });

const contactRoutes = require('./routes/contact');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/contact', contactRoutes);
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

const cases = [
  { label: 'Valid submission', body: { name: 'Sakshi Singh', email: 'sakshi@example.com', subject: 'Hello', message: 'Test message' } },
  { label: 'Empty name (whitespace only)', body: { name: '   ', email: 'a@b.com', message: 'hi' } },
  { label: 'Missing name field entirely', body: { email: 'a@b.com', message: 'hi' } },
  { label: 'Name over 100 chars', body: { name: 'x'.repeat(101), email: 'a@b.com', message: 'hi' } },
  { label: 'Malformed email — no @', body: { name: 'Sakshi', email: 'notanemail', message: 'hi' } },
  { label: 'Malformed email — no domain', body: { name: 'Sakshi', email: 'sakshi@', message: 'hi' } },
  { label: 'Malformed email — spaces', body: { name: 'Sakshi', email: 'sak shi@example.com', message: 'hi' } },
  { label: 'Empty email', body: { name: 'Sakshi', email: '', message: 'hi' } },
  { label: 'Subject over 150 chars', body: { name: 'Sakshi', email: 'a@b.com', subject: 'x'.repeat(151), message: 'hi' } },
  { label: 'Empty message (whitespace only)', body: { name: 'Sakshi', email: 'a@b.com', message: '   ' } },
  { label: 'Message over 2000 chars', body: { name: 'Sakshi', email: 'a@b.com', message: 'x'.repeat(2001) } },
  { label: 'Message exactly 2000 chars (boundary)', body: { name: 'Sakshi', email: 'a@b.com', message: 'x'.repeat(2000) } },
  { label: 'Non-string field (name as number)', body: { name: 12345, email: 'a@b.com', message: 'hi' } },
  { label: 'Extra unexpected field', body: { name: 'Sakshi', email: 'a@b.com', message: 'hi', extra: 'ignored?' } },
  { label: 'Completely empty body', body: {} },
];

(async () => {
  console.log('=== JSON body edge cases ===\n');
  for (const c of cases) {
    const res = await request(app).post('/api/contact').send(c.body);
    console.log(`${c.label}`);
    console.log(`  -> status ${res.status} | ${JSON.stringify(res.body)}`);
  }

  console.log('\n=== Malformed JSON body (raw, not parseable) ===');
  const malformed = await request(app)
    .post('/api/contact')
    .set('Content-Type', 'application/json')
    .send('{ "name": "Sakshi", "email": }'); // syntactically broken JSON
  console.log(`  -> status ${malformed.status} | ${JSON.stringify(malformed.body)}`);

  console.log('\n=== No Content-Type header (raw string body) ===');
  const noType = await request(app).post('/api/contact').type('text').send('name=Sakshi');
  console.log(`  -> status ${noType.status} | ${JSON.stringify(noType.body)}`);

  console.log('\n=== Unknown route (404 check) ===');
  const notFound = await request(app).get('/api/contact/nonexistent');
  console.log(`  -> status ${notFound.status} | ${JSON.stringify(notFound.body)}`);
})();
