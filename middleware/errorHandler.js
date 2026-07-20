const logger = require('../utils/logger');

// Express recognizes this as error-handling middleware specifically because
// it takes 4 arguments (err, req, res, next). This is a safety net — routes
// should still catch and handle their own errors, but anything that slips
// through (a bug, an unexpected crash) lands here instead of taking the
// whole server down or leaking a raw stack trace to the client.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, err);
    return next(err);
  }

  // express.json() throws this specific error type when the request body
  // is malformed JSON. That's a client mistake, not a server failure —
  // without this check it was being reported as a 500, which is misleading
  // both to the client and in the logs.
  if (err.type === 'entity.parse.failed') {
    logger.warn(`Malformed JSON body on ${req.method} ${req.originalUrl}`);
    return res.status(400).json({
      success: false,
      error: 'Request body must be valid JSON.',
    });
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, err);
  res.status(500).json({
    success: false,
    error: 'Something went wrong on our end. Please try again shortly.',
  });
}

module.exports = errorHandler;
