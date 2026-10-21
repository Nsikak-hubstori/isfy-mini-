/**
 * Optional API-key guard. If API_KEY is set, requests to /api must send
 * header `x-api-key`. The Shopify webhook is excluded (it uses HMAC instead).
 */
const crypto = require('crypto');
const { HttpError } = require('./errors');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function apiKeyAuth(req, _res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return next(); // auth disabled (local dev)
  if (req.path.startsWith('/webhooks/')) return next();
  const provided = req.get('x-api-key');
  if (!provided || !safeEqual(provided, expected)) return next(new HttpError(401, 'Invalid or missing API key'));
  next();
}

module.exports = { apiKeyAuth };
