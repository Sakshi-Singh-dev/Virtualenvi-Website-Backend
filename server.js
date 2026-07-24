// These two lines MUST run before anything else touches the network.
//
// 1. Prefer IPv4 in DNS lookups (reduces but doesn't fully eliminate the
//    issue on its own — Node's "Happy Eyeballs" behavior below can still
//    override this).
// 2. Disable Node's automatic dual-stack connection racing entirely. By
//    default, Node tries IPv4 AND IPv6 in parallel for any connection and
//    uses whichever responds first. Render's network allows outbound IPv6
//    routing at the DNS/routing level but silently drops the actual
//    packets, so the IPv6 attempt hangs instead of failing fast — and the
//    whole connection can get stuck waiting on it for up to Nodemailer's
//    2-minute default timeout. Disabling this makes Node try addresses
//    one at a time, in the ipv4-first order set above, with no race to
//    get stuck in.
require('dns').setDefaultResultOrder('ipv4first');
require('net').setDefaultAutoSelectFamily(false);

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

// Render sits the app behind a reverse proxy, so the real visitor IP
// arrives via the X-Forwarded-For header rather than the raw socket
// connection. Without this, express-rate-limit can't reliably tell
// visitors apart by IP, and Express throws a validation warning on every
// request. `1` means "trust exactly one hop" — appropriate for Render's
// setup, safer than trusting an arbitrary number of proxies.
app.set('trust proxy', 1);

// ── CORS — locked down to only the actual Virtualenvi website ──
const allowedOrigins = [
  'https://sakshi-singh-dev.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

app.use(cors({
  origin: function (origin, callback) {
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
app.use(requestLogger);

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
