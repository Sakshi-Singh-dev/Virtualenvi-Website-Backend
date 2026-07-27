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
