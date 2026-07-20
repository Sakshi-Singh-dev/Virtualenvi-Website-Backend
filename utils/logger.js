const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Make sure the logs folder exists before we try to write to it
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

function timestamp() {
  return new Date().toISOString();
}

function writeToFile(line) {
  fs.appendFile(LOG_FILE, line + '\n', (err) => {
    if (err) {
      // If we can't even write the log, at least surface that in the console
      console.error('Failed to write to log file:', err.message);
    }
  });
}

function info(message) {
  const line = `[${timestamp()}] [INFO] ${message}`;
  console.log(line);
  writeToFile(line);
}

function warn(message) {
  const line = `[${timestamp()}] [WARN] ${message}`;
  console.warn(line);
  writeToFile(line);
}

function error(message, err) {
  const details = err && err.stack ? `\n${err.stack}` : '';
  const line = `[${timestamp()}] [ERROR] ${message}${details}`;
  console.error(line);
  writeToFile(line);
}

module.exports = { info, warn, error };
