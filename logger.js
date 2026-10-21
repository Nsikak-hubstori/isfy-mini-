/**
 * Logging + request tracing.
 *
 *  - logger: tiny structured (JSON-line) logger. JSON lines are what Vercel,
 *    Railway, Datadog, Logtail, etc. ingest and index out of the box.
 *  - requestLogger: assigns a request id (x-request-id) and logs every request
 *    with method, path, status and latency via morgan.
 */
const crypto = require('crypto');
const morgan = require('morgan');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = () => LEVELS[process.env.LOG_LEVEL] || LEVELS.info;

function write(level, event, fields = {}) {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? console.error : console.log)(line);
}

const logger = {
  debug: (event, fields) => write('debug', event, fields),
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
};

morgan.token('id', (req) => req.id);

const httpLogger = morgan(
  (tokens, req, res) =>
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'http.request',
      request_id: tokens.id(req, res),
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      ms: Number(tokens['response-time'](req, res)),
    }),
  { skip: () => process.env.NODE_ENV === 'test' }
);

function requestId(req, res, next) {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  res.set('x-request-id', req.id);
  next();
}

module.exports = { logger, requestLogger: [requestId, httpLogger] };
