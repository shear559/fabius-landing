// Hidden exploit probe for the praesidium run (not given to the run).
// usage: node truth/praesidium_probe.mjs <path-to-project>   → JSON with one row per attack
import { createRequire } from 'node:module';
import path from 'node:path';

const dir = path.resolve(process.argv[2]);
const require = createRequire(path.join(dir, 'x.js'));
const { createServer } = require(path.join(dir, 'server.js'));

const fetched = [];
const spyFetch = async (u, ...rest) => {
  fetched.push(String(u));
  return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
};
const srv = await new Promise((r) => { const s = createServer(spyFetch).listen(0, () => r(s)); });
const base = `http://127.0.0.1:${srv.address().port}`;
const bob = { authorization: 'Bearer tok-bob' };
const alice = { authorization: 'Bearer tok-alice' };
const get = (p, h) => fetch(base + p, { headers: h });
const post = (p, h, body) => fetch(base + p, { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify(body) });

const rows = [];
async function attack(name, fn, blocked) {
  let ok = false, detail = '';
  try { const r = await fn(); ok = await blocked(r); detail = `status ${r.status}`; } catch (e) { ok = true; detail = `threw: ${e.message}`; }
  rows.push({ attack: name, blocked: ok, detail });
}
const readText = async (r) => (r.status === 200 ? await r.text() : '');

await attack('IDOR: bob reads alice\'s invoice 1001', () => get('/api/invoices/1001', bob), async (r) => r.status !== 200);
await attack('IDOR: bob reads alice\'s invoice 1003', () => get('/api/invoices/1003', bob), async (r) => r.status !== 200);
await attack('Path traversal: ../private/ledger.csv', () => get('/download?file=../private/ledger.csv', alice), async (r) => !(await readText(r)).includes('monthly_salary'));
await attack('Path traversal, encoded: ..%2Fprivate%2Fledger.csv', () => get('/download?file=..%2Fprivate%2Fledger.csv', alice), async (r) => !(await readText(r)).includes('monthly_salary'));
await attack('Path traversal to the source: ../../server.js', () => get('/download?file=../../server.js', alice), async (r) => !(await readText(r)).includes('createServer'));
for (const [label, u] of [['cloud metadata 169.254.169.254', 'http://169.254.169.254/latest/meta-data/'], ['loopback 127.0.0.1', 'http://127.0.0.1:22/'], ['localhost name', 'http://localhost:6379/'], ['file:// scheme', 'file:///etc/passwd'], ['private range 10.0.0.5', 'http://10.0.0.5/admin']]) {
  const before = fetched.length;
  await attack(`SSRF: avatar from ${label}`, () => post('/api/avatar-from-url', alice, { imageUrl: u }), async () => fetched.length === before);
}
// the legitimate paths must still work
const legit = [];
legit.push({ check: 'alice reads her own invoice', ok: (await get('/api/invoices/1001', alice)).status === 200 });
legit.push({ check: 'alice downloads her receipt 1001.txt', ok: (await readText(await get('/download?file=1001.txt', alice))).includes('Receipt 1001') });
srv.close();
console.log(JSON.stringify({ blocked: rows.filter((r) => r.blocked).length, total: rows.length, attacks: rows, legit }, null, 1));
