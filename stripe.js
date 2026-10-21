/**
 * Stripe integration (stub). Records a commission row and returns a fake
 * payment id. With STRIPE_SECRET_KEY set, swap the marked block for a real
 * Stripe Connect transfer to the rep's connected account.
 */
const { getSupabase, unwrap } = require('../supabaseClient');
const { logger } = require('../middleware/logger');

async function createPayout({ cartId, repId, amount }) {
  const live = Boolean(process.env.STRIPE_SECRET_KEY);
  let paymentId;
  let status;

  try {
    if (live) {
      // TODO(next week): stripe.transfers.create({ amount: cents, currency: 'usd', destination: rep.stripe_account_id })
      logger.warn('stripe.live_not_implemented', { cart_id: cartId });
    }
    paymentId = `stub_pi_${Date.now()}`;
    status = 'pending';
    console.log(`[stripe:stub] payout $${amount} for rep ${repId} (cart ${cartId}) -> ${paymentId}`);
  } catch (err) {
    logger.error('stripe.payout_failed', { cart_id: cartId, rep_id: repId, message: err.message });
    paymentId = null;
    status = 'failed';
  }

  const row = unwrap(
    await getSupabase()
      .from('commissions')
      .insert({ cart_id: cartId, rep_id: repId, amount, stripe_payment_id: paymentId, status })
      .select()
      .single(),
    'insert commission'
  );
  logger.info('stripe.payout_recorded', { commission_id: row.id, amount, status });
  return row;
}

module.exports = { createPayout };
