const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const logger = require('../utils/logger');
const { sendContactNotification, sendConfirmationEmail } = require('../utils/mailer');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// POST /api/contact
router.post('/', async (req, res, next) => {
  try {
    // Guard against a completely missing or malformed body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Request body is missing or invalid.' });
    }

    // Trim first so whitespace-only values ("   ") are treated as empty,
    // not as valid non-empty strings.
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    // Check each required field individually so the error tells the user
    // exactly what's wrong, instead of one generic combined message.
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    if (name.length > 100) {
      return res.status(400).json({ success: false, error: 'Name must be under 100 characters.' });
    }
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (subject.length > 150) {
      return res.status(400).json({ success: false, error: 'Subject must be under 150 characters.' });
    }
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Message must be under 2000 characters.' });
    }

    const contact = await Contact.create({ name, email, subject, message });

    // Fire-and-forget: don't await these in a way that could delay or fail
    // the response to the user. Emails are a nice-to-have; the database
    // save is the source of truth.
    sendContactNotification(contact);
    sendConfirmationEmail(contact);

    return res.status(201).json({
      success: true,
      message: 'Thanks — your message has been received.',
      data: { id: contact._id },
    });
  } catch (err) {
    // Mongoose validation errors (defense in depth — should rarely trigger
    // now that the checks above catch most bad input first)
    if (err.name === 'ValidationError') {
      const firstError = Object.values(err.errors)[0].message;
      return res.status(400).json({ success: false, error: firstError });
    }

    logger.error('Unexpected error saving contact submission', err);
    // Anything genuinely unexpected (e.g. DB connection dropped mid-request)
    // gets passed to the centralized error handler in server.js.
    return next(err);
  }
});

module.exports = router;
