require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const contactRoutes = require('./routes/contact');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const contactLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS — locked down to only the actual Virtualenvi website ──
// Previously cors() with no options allowed requests from ANY website,
// meaning anyone could embed a form on their own page that silently
// submits to your backend, spamming your database and email quota.
// Now only these specific origins are allowed to call the API.
const allowedOrigins = [
  'https://sakshi-singh-dev.github.io', // live GitHub Pages site
  'http://localhost:5500',              // common Live Server port, for local dev
  'http://127.0.0.1:5500',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. Thunder Client, curl, server-to-server)
    // — these don't send an Origin header at all, so they're not a CORS risk.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked CORS request from disallowed origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
}));

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // logs every request once it completes

// ── Routes ──
app.get('/', (req, res) => {
  res.json({ status: 'Virtualenvi backend is running' });
});

app.use('/api/contact', contactLimiter, contactRoutes);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Centralized error handler — must be the LAST app.use() call ──
app.use(errorHandler);

// ── Start server ──
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

start();
