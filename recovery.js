const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errors');
const { requireUuid } = require('../utils');
const crm = require('../services/crm');
const sendgrid = require('../services/sendgrid');
const twilio = require('../services/twilio');

const router = express.Router();

/** POST /api/recovery/email  { cart_id, template_name?, subject? } */
router.post('/recovery/email', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const cart = await crm.getCart(requireUuid(b.cart_id, 'cart_id'));
  if (!cart.customer_email) throw new HttpError(422, 'Cart has no customer email');
  const email = await sendgrid.logEmail({
    cart_id: cart.id,
    to: cart.customer_email,
    template_name: b.template_name || 'cart_recovery_1',
    subject: b.subject || 'You left something behind...',
  });
  res.status(201).json({ email });
}));

/** POST /api/recovery/sms  { cart_id, message? } */
router.post('/recovery/sms', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const cart = await crm.getCart(requireUuid(b.cart_id, 'cart_id'));
  if (!cart.customer_phone) throw new HttpError(422, 'Cart has no customer phone');
  const message = b.message || 'Hi! You left items in your cart. Reply YES and we will hold them for you.';
  const log = await twilio.sendSms({ cart_id: cart.id, to: cart.customer_phone, message });
  res.status(201).json({ sms: log });
}));

module.exports = router;
