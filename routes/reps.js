const express = require('express');
const router = express.Router();
router.get('/reps', (req,res)=> res.json({ ok:true, reps:[] }));
module.exports = router;
