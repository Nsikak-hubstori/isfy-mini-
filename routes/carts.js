const express = require('express');
const router = express.Router();
let carts = [
  { id: '1', customer_name: 'John Doe', phone: '+2348012345678', items: 2, total: 45000, status: 'abandoned', rep_id: null, created_at: new Date().toISOString() }
];

router.get('/carts', (req,res)=>{
  const { status } = req.query;
  let data = carts;
  if(status) data = data.filter(c=>c.status===status);
  res.json({ ok:true, count: data.length, carts: data });
});

router.get('/carts/:id', (req,res)=>{
  const cart = carts.find(c=>c.id===req.params.id);
  if(!cart) return res.status(404).json({ ok:false, error:'Cart not found' });
  res.json({ ok:true, cart });
});

router.post('/carts', (req,res)=>{
  const { customer_name, phone, items, total } = req.body;
  if(!phone || !total) return res.status(400).json({ ok:false, error:'phone and total required' });
  const newCart = { 
    id: Date.now().toString(), customer_name: customer_name||'Guest', phone, items: items||1, total, 
    status: 'abandoned', rep_id: null, created_at: new Date().toISOString() 
  };
  carts.push(newCart);
  res.status(201).json({ ok:true, cart: newCart });
});

router.put('/carts/:id/assign', (req,res)=>{
  const cart = carts.find(c=>c.id===req.params.id);
  if(!cart) return res.status(404).json({ ok:false, error:'Not found' });
  cart.rep_id = req.body.rep_id;
  cart.status = 'assigned';
  res.json({ ok:true, cart });
});

module.exports = router;
