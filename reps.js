const express = require('express');
const { getSupabase, unwrap } = require('../supabaseClient');
const { asyncHandler, HttpError } = require('../middleware/errors');
const { requireUuid } = require('../utils');

const router = express.Router();
const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

/** GET /api/reps?min_rating=4.5  -- the marketplace: active reps, best rated first */
router.get('/reps', asyncHandler(async (req, res) => {
  let q = getSupabase().from('sales_reps')
    .select('id,name,rating,total_recovered,joined_at')
    .eq('is_active', true)
    .order('rating', { ascending: false });
  if (req.query.min_rating !== undefined) {
    const min = Number(req.query.min_rating);
    if (Number.isNaN(min)) throw new HttpError(400, 'min_rating must be a number');
    q = q.gte('rating', min);
  }
  const reps = unwrap(await q, 'list reps');
  res.json({ count: reps.length, reps });
}));

/** GET /api/reps/:id/stats */
router.get('/reps/:id/stats', asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id, 'rep id');
  const db = getSupabase();
  const rep = unwrap(await db.from('sales_reps').select('*').eq('id', id).maybeSingle(), 'get rep');
  if (!rep) throw new HttpError(404, 'Rep not found');

  const [assignments, calls, commissions] = await Promise.all([
    db.from('assignments').select('status').eq('rep_id', id),
    db.from('call_logs').select('duration_seconds,outcome').eq('rep_id', id),
    db.from('commissions').select('amount,status').eq('rep_id', id),
  ]);
  const a = unwrap(assignments, 'rep assignments');
  const c = unwrap(calls, 'rep calls');
  const m = unwrap(commissions, 'rep commissions');

  res.json({
    rep: { id: rep.id, name: rep.name, rating: rep.rating, total_recovered: rep.total_recovered },
    assignments: { total: a.length, active: a.filter((x) => x.status === 'active').length },
    calls: { total: c.length, talk_seconds: sum(c, 'duration_seconds'), recovered: c.filter((x) => x.outcome === 'recovered').length },
    commissions: {
      pending: sum(m.filter((x) => x.status === 'pending'), 'amount'),
      paid: sum(m.filter((x) => x.status === 'paid'), 'amount'),
    },
  });
}));

module.exports = router;
