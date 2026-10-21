const express = require('express');
const { getSupabase, unwrap } = require('../supabaseClient');
const { asyncHandler, HttpError } = require('../middleware/errors');
const { requireUuid } = require('../utils');
const twilio = require('../services/twilio');
const crm = require('../services/crm');

const router = express.Router();
const OUTCOMES = ['no_answer', 'voicemail', 'callback', 'not_interested', 'recovered'];

/** POST /api/calls/log  { cart_id, rep_id, duration_seconds, outcome, notes?, recording_url? } */
router.post('/calls/log', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const cart_id = requireUuid(b.cart_id, 'cart_id');
  const rep_id = requireUuid(b.rep_id, 'rep_id');
  if (!OUTCOMES.includes(b.outcome)) throw new HttpError(400, `outcome must be one of: ${OUTCOMES.join(', ')}`);
  const duration = b.duration_seconds === undefined ? 0 : Number(b.duration_seconds);
  if (!Number.isInteger(duration) || duration < 0) throw new HttpError(400, 'duration_seconds must be a non-negative integer');

  await crm.getCart(cart_id); // 404 early if cart doesn't exist
  const call = await twilio.logCall({
    cart_id, rep_id, duration_seconds: duration, outcome: b.outcome,
    notes: b.notes || null, recording_url: b.recording_url || null,
  });
  const cart = await crm.applyCallOutcome({ cartId: cart_id, repId: rep_id, outcome: b.outcome });
  res.status(201).json({ call, cart_status: cart.status });
}));

/** GET /api/calls?rep_id=&cart_id= */
router.get('/calls', asyncHandler(async (req, res) => {
  let q = getSupabase().from('call_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (req.query.rep_id) q = q.eq('rep_id', requireUuid(req.query.rep_id, 'rep_id'));
  if (req.query.cart_id) q = q.eq('cart_id', requireUuid(req.query.cart_id, 'cart_id'));
  const calls = unwrap(await q, 'list calls');
  res.json({ count: calls.length, calls });
}));

module.exports = router;
