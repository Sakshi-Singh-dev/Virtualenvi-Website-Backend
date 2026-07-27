const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, err);
    return next(err);
  }


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
