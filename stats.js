const express = require('express');
const { getSupabase, unwrap } = require('../supabaseClient');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

/** GET /api/stats/recovered -> total recovered $, conversion rate, pipeline counts */
router.get('/stats/recovered', asyncHandler(async (_req, res) => {
  const carts = unwrap(await getSupabase().from('abandoned_carts').select('status,cart_value'), 'stats carts');
  const recovered = carts.filter((c) => c.status === 'recovered');
  const byStatus = carts.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
  res.json({
    total_carts: carts.length,
    recovered_carts: recovered.length,
    total_recovered_value: Math.round(recovered.reduce((s, c) => s + Number(c.cart_value), 0) * 100) / 100,
    conversion_rate: carts.length ? Math.round((recovered.length / carts.length) * 10000) / 100 : 0, // percent
    by_status: byStatus,
  });
}));

/** GET /api/stats/reps-leaderboard?limit=10 */
router.get('/stats/reps-leaderboard', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const reps = unwrap(
    await getSupabase().from('sales_reps').select('id,name,rating,total_recovered').eq('is_active', true)
      .order('total_recovered', { ascending: false }).limit(limit),
    'leaderboard'
  );
  res.json({ leaderboard: reps.map((r, i) => ({ rank: i + 1, ...r })) });
}));

module.exports = router;
