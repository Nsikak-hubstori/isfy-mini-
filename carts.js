const crypto = require('crypto');
const express = require('express');
const { getSupabase, unwrap } = require('../supabaseClient');
const { asyncHandler, HttpError } = require('../middleware/errors');
const { logger } = require('../middleware/logger');
const { requireUuid, CART_STATUSES } = require('../utils');
const crm = require('../services/crm');

const router = express.Router();

/** GET /api/carts?status=new&store_id=&limit=50 */
router.get('/carts', asyncHandler(async (req, res) => {
  const { status, store_id } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  if (status && !CART_STATUSES.includes(status)) {
    throw new HttpError(400, `status must be one of: ${CART_STATUSES.join(', ')}`);
  }
  let q = getSupabase().from('abandoned_carts').select('*, stores(name, shopify_domain)').order('abandoned_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  if (store_id) q = q.eq('store_id', requireUuid(store_id, 'store_id'));
  const data = unwrap(await q, 'list carts');
  res.json({ count: data.length, carts: data });
}));

/** POST /api/carts/:id/assign  { rep_id } */
router.post('/carts/:id/assign', asyncHandler(async (req, res) => {
  const cartId = requireUuid(req.params.id, 'cart id');
  const repId = requireUuid(req.body && req.body.rep_id, 'rep_id');
  const assignment = await crm.assignCart(cartId, repId);
  res.status(201).json({ assignment });
}));

/** Constant-time check of Shopify's X-Shopify-Hmac-Sha256 header (base64 HMAC of raw body). */
function validShopifySignature(rawBody, secret, header) {
  if (!rawBody || !secret || !header) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const given = Buffer.from(header, 'base64');
  return given.length === digest.length && crypto.timingSafeEqual(given, digest);
}

/**
 * POST /api/webhooks/shopify/abandoned-cart
 * Shopify "checkouts/create" style payload. Identifies the store by the
 * X-Shopify-Shop-Domain header and verifies the HMAC with that store's secret.
 */
router.post('/webhooks/shopify/abandoned-cart', asyncHandler(async (req, res) => {
  const shop = req.get('x-shopify-shop-domain');
  if (!shop) throw new HttpError(400, 'Missing X-Shopify-Shop-Domain header');

  const db = getSupabase();
  const store = unwrap(await db.from('stores').select('id, webhook_secret').eq('shopify_domain', shop).maybeSingle(), 'find store');
  if (!store) throw new HttpError(404, `Unknown store: ${shop}`);

  if (!validShopifySignature(req.rawBody, store.webhook_secret, req.get('x-shopify-hmac-sha256'))) {
    logger.warn('webhook.bad_signature', { shop, request_id: req.id });
    throw new HttpError(401, 'Invalid webhook signature');
  }

  const p = req.body || {};
  const email = p.email || (p.customer && p.customer.email) || null;
  const phone = p.phone || (p.shipping_address && p.shipping_address.phone) || (p.customer && p.customer.phone) || null;
  if (!email && !phone) throw new HttpError(422, 'Payload has no email or phone: cart is not recoverable');

  const items = (p.line_items || []).map((i) => ({
    sku: i.sku, name: i.title || i.name, qty: i.quantity, price: Number(i.price),
  }));
  const cart = unwrap(
    await db.from('abandoned_carts').insert({
      store_id: store.id,
      customer_email: email,
      customer_phone: phone,
      cart_value: Number(p.total_price) || items.reduce((s, i) => s + i.qty * i.price, 0),
      items,
      abandoned_at: p.updated_at || p.created_at || new Date().toISOString(),
    }).select().single(),
    'insert abandoned cart'
  );
  logger.info('webhook.cart_received', { cart_id: cart.id, shop, value: cart.cart_value });
  await crm.syncToExternalCrm('cart.created', cart);
  res.status(201).json({ cart_id: cart.id });
}));

module.exports = router;
