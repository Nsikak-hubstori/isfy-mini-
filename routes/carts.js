const express = require('express');
const router = express.Router();
router.get('/carts', (req,res)=> res.json({ ok:true, carts:[] }));
module.exports = router;
