const logger = require('../utils/logger');

// Logs every incoming request once it finishes, with method, path,
// status code, and how long it took — makes it possible to trace what
// happened around any given error just by scrolling the log file.
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const line = `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`;

    if (res.statusCode >= 500) {
      logger.error(line);
    } else if (res.statusCode >= 400) {
      logger.warn(line);
    } else {
      logger.info(line);
    }
  });

  next();
}

module.exports = requestLogger;
