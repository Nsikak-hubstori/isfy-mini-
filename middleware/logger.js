const logger = {
  info: (msg, meta) => console.log(msg, meta || ''),
  error: (msg, meta) => console.error(msg, meta || ''),
  warn: (msg, meta) => console.warn(msg, meta || ''),
};
const requestLogger = (req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};
module.exports = { logger, requestLogger };
