const express = require('express');
const router = express.Router();
let calls = [];

router.get('/calls', (req,res)=>{
  const { cart_id } = req.query;
  let data = calls;
  if(cart_id) data = calls.filter(c=>c.cart_id===cart_id);
  res.json({ ok:true, count: data.length, calls: data });
});

router.post('/calls', (req,res)=>{
  const { cart_id, rep_id, duration, outcome, notes } = req.body;
  if(!cart_id || !rep_id) return res.status(400).json({ ok:false, error:'cart_id and rep_id required' });
  const call = { 
    id: Date.now().toString(), cart_id, rep_id, duration: duration||0, 
    outcome: outcome||'no_answer', notes: notes||'', created_at: new Date().toISOString() 
  };
  calls.push(call);
  res.status(201).json({ ok:true, call });
});
module.exports = router;
