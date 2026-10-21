/**
 * Smoke + validation tests (no database needed: every case below is rejected
 * or answered before a query is made). Uses Node's built-in test runner.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
delete process.env.API_KEY;

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/index');

let server;
let base;

before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('GET /health returns ok and a request id', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).status, 'ok');
  assert.ok(res.headers.get('x-request-id'));
});

test('unknown route -> 404 JSON', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.strictEqual(res.status, 404);
  assert.ok((await res.json()).error);
});

test('GET /api/carts rejects an invalid status', async () => {
  const res = await fetch(`${base}/api/carts?status=banana`);
  assert.strictEqual(res.status, 400);
});

test('assign rejects a non-UUID cart id', async () => {
  const res = await post('/api/carts/not-a-uuid/assign', { rep_id: 'x' });
  assert.strictEqual(res.status, 400);
});

test('call log rejects an unknown outcome', async () => {
  const res = await post('/api/calls/log', {
    cart_id: 'c3000000-0000-0000-0000-000000000001',
    rep_id: 'b2000000-0000-0000-0000-000000000001',
    outcome: 'teleported',
  });
  assert.strictEqual(res.status, 400);
});

test('shopify webhook without shop-domain header -> 400', async () => {
  const res = await post('/api/webhooks/shopify/abandoned-cart', { email: 'a@b.com' });
  assert.strictEqual(res.status, 400);
});

test('malformed JSON -> 400, not 500', async () => {
  const res = await fetch(`${base}/api/calls/log`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  assert.strictEqual(res.status, 400);
});

test('API key is enforced when API_KEY is set (webhook exempt)', async () => {
  process.env.API_KEY = 'secret';
  try {
    assert.strictEqual((await fetch(`${base}/api/carts`)).status, 401);
    // webhook skips key auth and fails later on its own validation (400)
    assert.strictEqual((await post('/api/webhooks/shopify/abandoned-cart', {})).status, 400);
  } finally {
    delete process.env.API_KEY;
  }
});
