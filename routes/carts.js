const express = require('express');
const router = express.Router();
const { getSupabase, unwrap } = require('../supabase');

router.get('/carts', async (req,res,next)=>{
  try{
    const { status } = req.query;
    let query = getSupabase().from('carts').select('*').order('created_at',{ascending:false});
    if(status) query = query.eq('status', status);
    const data = unwrap(await query, 'carts.list');
    res.json({ ok:true, source:'supabase', count:data.length, carts:data });
  }catch(e){ next(e); }
});

router.get('/carts/:id', async (req,res,next)=>{
  try{
    const data = unwrap(await getSupabase().from('carts').select('*').eq('id', req.params.id).single(), 'carts.get');
    res.json({ ok:true, cart:data });
  }catch(e){ next(e); }
});

router.post('/carts', async (req,res,next)=>{
  try{
    const { customer_name, phone, items, total } = req.body;
    if(!phone || !total) return res.status(400).json({ ok:false, error:'phone and total required' });
    const payload = { customer_name: customer_name||'Guest', phone, items: items||1, total, status:'abandoned', rep_id:null };
    const data = unwrap(await getSupabase().from('carts').insert(payload).select().single(), 'carts.create');
    res.status(201).json({ ok:true, saved_to:'supabase', cart:data });
  }catch(e){ next(e); }
});

router.put('/carts/:id/assign', async (req,res,next)=>{
  try{
    const data = unwrap(await getSupabase().from('carts').update({ rep_id:req.body.rep_id, status:'assigned' }).eq('id', req.params.id).select().single(), 'carts.assign');
    res.json({ ok:true, cart:data });
  }catch(e){ next(e); }
});

module.exports = router;
