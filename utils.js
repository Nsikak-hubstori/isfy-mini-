const { HttpError } = require('./middleware/errors');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Throws 400 unless value is a UUID. Returns the value for chaining. */
function requireUuid(value, name) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(400, `${name} must be a valid UUID`);
  }
  return value;
}

const CART_STATUSES = ['new', 'contacted', 'recovered', 'lost'];

module.exports = { requireUuid, CART_STATUSES };
