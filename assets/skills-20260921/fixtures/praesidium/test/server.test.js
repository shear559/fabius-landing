'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../server');

function start(fetchImpl) {
  return new Promise((resolve) => {
    const srv = createServer(fetchImpl).listen(0, () => resolve(srv));
  });
}

test('owner can read their invoice', async () => {
  const srv = await start();
  const { port } = srv.address();
  const r = await fetch(`http://127.0.0.1:${port}/api/invoices/1001`, { headers: { authorization: 'Bearer tok-alice' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).owner, 'alice');
  srv.close();
});

test('login is required', async () => {
  const srv = await start();
  const { port } = srv.address();
  const r = await fetch(`http://127.0.0.1:${port}/api/invoices/1001`);
  assert.strictEqual(r.status, 401);
  srv.close();
});
