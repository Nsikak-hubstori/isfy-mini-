const express = require('express');
const router = express.Router();
router.get('/calls', (req,res)=> res.json({ ok:true, calls:[] }));
module.exports = router;
