const express = require('express');
const router = express.Router();

router.get('/stats', (req,res)=>{
  res.json({
    ok: true,
    stats: {
      total_carts: 15,
      abandoned: 10,
      assigned: 3,
      recovered: 2,
      recovery_rate: '13.3%',
      total_revenue: 45000,
      recovered_revenue: 120000,
      active_reps: 1
    },
    generated_at: new Date().toISOString()
  });
});
module.exports = router;
