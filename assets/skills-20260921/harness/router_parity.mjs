// Proves the served router (route.mjs + browser stand-ins) classifies exactly like the shipped runtime.
// usage: node harness/router_parity.mjs
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const real = await import(pathToFileURL(path.join(homedir(), '.claude/plugins/cache/fabius/fabius/3.2.0/runtime/src/route.mjs')).href);
const served = await import(pathToFileURL(path.join(HERE, '../runtime/route.mjs')).href);
const corpus = [
  'threat-model our file upload endpoint', 'design a landing page hero and chart the signup data',
  'build a multi-agent research team with a reviewer', 'rename the button label to Save',
  'what did we decide last time about the auth flow?', 'backtest this moving-average strategy and show max drawdown',
  'make a small arcade shooter with a high-score loop', 'seal this release and sign it with a key',
  'when a form is submitted, email the lead and add a row to the sheet with n8n', 'run differential expression on this rna-seq counts matrix',
  'should we fine-tune or is RAG enough? train a classifier', 'ask three models whether this proof holds',
  'fix the failing test in billing and refactor the proration code', 'write the launch post and the positioning for our app',
  'plan the migration of our monolith to services: system design, then steps', 'summarize this meeting transcript',
  'Is this secure?', 'תכנן את ההשקה ותכתוב קופי לדף הנחיתה', 'audit the security headers and tls certificate of our domain',
  'smart contract review for this solidity vault before we deploy to production',
];
const pick = (r) => JSON.stringify({ axes: r.axes, recall: r.recall, layers: r.layers, domains: r.domains, rung: r.rung, tier: r.tier,
  classify: r.rationale.classify, ladder: r.rationale.ladder, tier_why: r.rationale.tier });
let same = 0;
for (const t of corpus) {
  const a = pick(real.route(t, { cfg: {} })), b = pick(served.route(t));
  if (a === b) same++; else console.log('DIFF', t, '\n  real  ', a, '\n  served', b);
}
console.log(`router parity: ${same}/${corpus.length} identical`);
process.exit(same === corpus.length ? 0 : 1);
