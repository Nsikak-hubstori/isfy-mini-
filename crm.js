/**
 * CRM domain logic: the single place that mutates cart lifecycle state.
 * Routes stay thin; integrations (stripe/twilio/sendgrid) are called from here
 * or from their own routes.
 *
 * Lifecycle: new -> contacted -> recovered | lost
 */
const { getSupabase, unwrap } = require('../supabaseClient');
const { logger } = require('../middleware/logger');
const { HttpError } = require('../middleware/errors');
const stripe = require('./stripe');

async function getCart(cartId) {
  const row = unwrap(
    await getSupabase().from('abandoned_carts').select('*').eq('id', cartId).maybeSingle(),
    'get cart'
  );
  if (!row) throw new HttpError(404, 'Cart not found');
  return row;
}

async function setCartStatus(cartId, status) {
  const row = unwrap(
    await getSupabase().from('abandoned_carts').update({ status }).eq('id', cartId).select().single(),
    'update cart status'
  );
  logger.info('crm.cart_status', { cart_id: cartId, status });
  return row;
}

/** Assigns a cart to an active rep. Rejects if the cart already has an active assignment. */
async function assignCart(cartId, repId) {
  const db = getSupabase();
  const cart = await getCart(cartId);
  if (['recovered', 'lost'].includes(cart.status)) throw new HttpError(409, `Cart is already ${cart.status}`);

  const rep = unwrap(await db.from('sales_reps').select('id,name,is_active').eq('id', repId).maybeSingle(), 'get rep');
  if (!rep) throw new HttpError(404, 'Rep not found');
  if (!rep.is_active) throw new HttpError(409, 'Rep is not active');

  const existing = unwrap(
    await db.from('assignments').select('id').eq('cart_id', cartId).eq('status', 'active').limit(1),
    'check existing assignment'
  );
  if (existing.length) throw new HttpError(409, 'Cart already has an active assignment');

  const assignment = unwrap(
    await db.from('assignments').insert({ cart_id: cartId, rep_id: repId, status: 'active' }).select().single(),
    'create assignment'
  );
  logger.info('crm.cart_assigned', { cart_id: cartId, rep_id: repId, assignment_id: assignment.id });
  return assignment;
}

/**
 * Applies a call outcome to the cart. 'recovered' closes the loop:
 * cart -> recovered, rep.total_recovered += value, commission row + payout.
 */
async function applyCallOutcome({ cartId, repId, outcome }) {
  const cart = await getCart(cartId);

  if (outcome === 'recovered') {
    if (cart.status === 'recovered') return cart; // idempotent
    await setCartStatus(cartId, 'recovered');
    if (repId) await creditRep(cart, repId);
    return { ...cart, status: 'recovered' };
  }
  if (outcome === 'not_interested') return setCartStatus(cartId, 'lost');
  if (cart.status === 'new') return setCartStatus(cartId, 'contacted');
  return cart;
}

async function creditRep(cart, repId) {
  const db = getSupabase();
  const rate = Number(process.env.COMMISSION_RATE || 0.15);
  const amount = Math.round(Number(cart.cart_value) * rate * 100) / 100;

  const rep = unwrap(await db.from('sales_reps').select('total_recovered').eq('id', repId).maybeSingle(), 'get rep');
  if (rep) {
    // NOTE: read-modify-write. Move to an RPC (`total_recovered = total_recovered + x`) to be race-free (see README "next week").
    unwrap(
      await db.from('sales_reps').update({ total_recovered: Number(rep.total_recovered || 0) + Number(cart.cart_value) }).eq('id', repId),
      'update rep total'
    );
  }
  await db.from('assignments').update({ status: 'completed' }).eq('cart_id', cart.id).eq('status', 'active');
  await stripe.createPayout({ cartId: cart.id, repId, amount });
}

/** Outbound CRM tool sync stub (HubSpot/Salesforce/etc). Logs only. */
async function syncToExternalCrm(event, payload) {
  logger.info('crm.external_sync_stub', { event, cart_id: payload && payload.id });
  return { synced: false, reason: 'stub' };
}

module.exports = { getCart, setCartStatus, assignCart, applyCallOutcome, syncToExternalCrm };
