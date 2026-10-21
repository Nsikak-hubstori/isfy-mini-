/**
 * ISFY-mini API entrypoint.
 * Exports the Express app (used by tests and by Vercel's @vercel/node) and only
 * binds a port when run directly (`npm start` / `npm run dev`).
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { logger, requestLogger } = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errors');
const { apiKeyAuth } = require('./middleware/auth');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(requestLogger);
// Keep the raw body: Shopify's HMAC is computed over the exact bytes received.
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Liveness probe for Vercel/Railway/uptime monitors. No DB call, no auth.
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime_s: Math.round(process.uptime()), ts: new Date().toISOString() }));

app.use('/api', apiKeyAuth);
app.use('/api', require('./routes/carts'));
app.use('/api', require('./routes/reps'));
app.use('/api', require('./routes/calls'));
app.use('/api', require('./routes/recovery'));
app.use('/api', require('./routes/stats'));

app.use(notFound);
app.use(errorHandler);

// Last-resort monitoring hooks: never die silently.
process.on('unhandledRejection', (reason) => logger.error('process.unhandledRejection', { reason: String(reason) }));
process.on('uncaughtException', (err) => { logger.error('process.uncaughtException', { message: err.message, stack: err.stack }); process.exit(1); });

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => logger.info('server.started', { port: Number(port), env: process.env.NODE_ENV || 'development' }));
}

module.exports = app;
