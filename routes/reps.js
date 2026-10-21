
const express = require('express');
const router = express.Router();
let reps = [
  { id: '1', name: 'Ada Rep', phone: '+2348090001111', active_carts: 1, recovered: 5, revenue: 120000 }
];

router.get('/reps', (req,res)=> res.json({ ok:true, count: reps.length, reps }));
router.post('/reps', (req,res)=>{
  const { name, phone } = req.body;
  if(!name) return res.status(400).json({ ok:false, error:'name required' });
  const rep = { id: Date.now().toString(), name, phone, active_carts:0, recovered:0, revenue:0 };
  reps.push(rep);
  res.status(201).json({ ok:true, rep });
});
module.exports = router;
