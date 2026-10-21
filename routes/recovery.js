const express = require('express');
const router = express.Router();

router.get('/recovery', (req,res)=>{
  // In real ISFY this would query recovered carts
  res.json({ ok:true, recovered: [], total_revenue: 0, message: 'Recovery records from carts with status recovered' });
});

router.post('/recovery/:cartId', (req,res)=>{
  res.json({ ok:true, cart_id: req.params.cartId, status: 'recovered', recovered_at: new Date().toISOString() });
});
module.exports = router;
