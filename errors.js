/**
 * Central error handling. Route handlers throw; this turns it into a
 * consistent JSON response and a structured log line (the "monitoring" hook:
 * every 5xx is logged at level=error with the request id for tracing).
 */
const { logger } = require('./logger');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wraps async handlers so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  const body = { error: status >= 500 ? 'Internal server error' : err.message, request_id: req.id };
  if (err.details) body.details = err.details;

  if (status >= 500) {
    logger.error('request.failed', { request_id: req.id, path: req.path, message: err.message, stack: err.stack });
    // Surface config/DB message outside production to speed up debugging.
    if (process.env.NODE_ENV !== 'production') body.message = err.message;
  } else {
    logger.warn('request.rejected', { request_id: req.id, path: req.path, status, message: err.message });
  }
  res.status(status).json(body);
}

module.exports = { HttpError, asyncHandler, notFound, errorHandler };
