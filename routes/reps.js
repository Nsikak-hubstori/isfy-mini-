const express = require('express');
const router = express.Router();
const { getSupabase, unwrap } = require('../supabase');

router.get('/reps', async (req,res,next)=>{
  try{
    const data = unwrap(await getSupabase().from('reps').select('*'), 'reps.list');
    res.json({ ok:true, source:'supabase', count:data.length, reps:data });
  }catch(e){ next(e); }
});

router.post('/reps', async (req,res,next)=>{
  try{
    const { name, phone } = req.body;
    if(!name) return res.status(400).json({ ok:false, error:'name required' });
    const data = unwrap(await getSupabase().from('reps').insert({ name, phone, active_carts:0, recovered:0, revenue:0 }).select().single(), 'reps.create');
    res.status(201).json({ ok:true, saved_to:'supabase', rep:data });
  }catch(e){ next(e); }
});

module.exports = router;
