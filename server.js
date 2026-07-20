require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const contactRoutes = require('./routes/contact');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors()); // Week 3: lock this down to your actual front-end domain
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // logs every request once it completes

// ── Routes ──
app.get('/', (req, res) => {
  res.json({ status: 'Virtualenvi backend is running' });
});

app.use('/api/contact', contactRoutes);

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
