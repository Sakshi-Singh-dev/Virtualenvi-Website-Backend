const rateLimit = require('express-rate-limit');

// Limits how many contact form submissions a single IP can make in a window of time.

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many submissions from this device. Please try again in a few minutes.',
  },
});

module.exports = contactLimiter;
