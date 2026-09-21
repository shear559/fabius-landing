'use strict';
// Invoices service — plain node:http, no dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const SESSIONS = { 'tok-alice': 'alice', 'tok-bob': 'bob' };
const INVOICES = {
  '1001': { id: '1001', owner: 'alice', amount_cents: 12900, memo: 'Studio rent, September' },
  '1002': { id: '1002', owner: 'bob', amount_cents: 4200, memo: 'Camera repair' },
  '1003': { id: '1003', owner: 'alice', amount_cents: 880, memo: 'Parking' },
};
const RECEIPTS_DIR = path.join(__dirname, 'files', 'receipts');

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function userFrom(req) {
  const auth = req.headers.authorization || '';
  return SESSIONS[auth.replace(/^Bearer /, '')] || null;
}

async function readBody(req) {
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

function createServer(fetchImpl = fetch) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const user = userFrom(req);

    if (url.pathname.startsWith('/api/invoices/') && req.method === 'GET') {
      if (!user) return send(res, 401, { error: 'login required' });
      const invoice = INVOICES[url.pathname.split('/').pop()];
      if (!invoice) return send(res, 404, { error: 'not found' });
      return send(res, 200, invoice);
    }

    if (url.pathname === '/download' && req.method === 'GET') {
      if (!user) return send(res, 401, { error: 'login required' });
      const file = path.join(RECEIPTS_DIR, url.searchParams.get('file') || '');
      if (!fs.existsSync(file)) return send(res, 404, { error: 'not found' });
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }

    if (url.pathname === '/api/avatar-from-url' && req.method === 'POST') {
      if (!user) return send(res, 401, { error: 'login required' });
      const { imageUrl } = await readBody(req);
      const r = await fetchImpl(imageUrl);
      const bytes = Buffer.from(await r.arrayBuffer());
      return send(res, 200, { saved: true, size: bytes.length, contentType: r.headers.get('content-type') });
    }

    send(res, 404, { error: 'no route' });
  });
}

if (require.main === module) {
  createServer().listen(3000, () => console.log('invoices on :3000'));
}

module.exports = { createServer, INVOICES, SESSIONS };
