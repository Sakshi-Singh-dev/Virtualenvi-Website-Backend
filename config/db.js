const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set in your .env file');
    }
    await mongoose.connect(uri);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', err);
    // Exit so the failure is obvious immediately rather than the server
    // silently running with no working database.
    process.exit(1);
  }
}

module.exports = connectDB;
