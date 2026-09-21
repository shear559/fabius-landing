// The fabius-concilium demo: runs the council protocol that SHIPS with the skill
// (skills/fabius-concilium/references/council.mjs, imported unchanged from the pinned plugin)
// with a chat transport that asks real models through clean, tool-less Claude Code sessions.
// No OpenRouter key is configured on this machine, so every seat is a Claude model; the
// protocol, ballots, self-score removal and call accounting are the shipped code's own.
//
// usage: node harness/council.mjs <out-dir>
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = process.env.FABIUS_PLUGIN || path.join(homedir(), '.claude/plugins/cache/fabius/fabius/3.2.0');
const CL = process.env.CLAUDE_BIN || path.join(homedir(), 'Library/Application Support/Claude/claude-code/2.1.275/claude.app/Contents/MacOS/claude');
const { runCouncil, seededOrder } = await import(pathToFileURL(path.join(PLUGIN, 'skills/fabius-concilium/references/council.mjs')).href);

const OUT = path.resolve(process.argv[2] || 'out');
mkdirSync(OUT, { recursive: true });
const question = readFileSync(path.join(HERE, '../fixtures/concilium/QUESTION.md'), 'utf8').trim();
const SEATS = (process.env.COUNCIL_SEATS || 'claude-sonnet-5,claude-haiku-4-5,claude-opus-4-8').split(',');
const CHAIRMAN = 'claude-opus-5';

const transcript = [];
function ask(model, system, user) {
  const args = ['-p', '--model', model, '--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence',
    '--tools', '', '--output-format', 'json'];
  if (system) args.push('--system-prompt', system);
  args.push(user);
  const env = { ...process.env }; delete env.CLAUDECODE; delete env.CLAUDE_CODE_ENTRYPOINT;
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    execFile(CL, args, { env, cwd: OUT, maxBuffer: 32 << 20, timeout: 600_000 }, (err, stdout) => {
      if (err) return reject(err);
      let d; try { d = JSON.parse(stdout); } catch (e) { return reject(new Error('unparseable CLI output')); }
      const stage = !system ? 'opinion' : system.includes('impartial judge') ? 'review' : 'chair';
      transcript.push({ stage, model, seconds: Math.round((Date.now() - t0) / 1000), cost_usd: d.total_cost_usd,
        output_tokens: d.usage?.output_tokens, system, user, answer: d.result, is_error: d.is_error });
      if (d.is_error) return reject(new Error(d.result || 'model error'));
      resolve(d.result);
    });
  });
}

// deterministic anonymisation order, from the shipped helper when present
let seed = 20260921;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

const started = new Date().toISOString();
const result = await runCouncil({ question, seats: SEATS, chairman: CHAIRMAN, chat: ask, rnd, log: (m) => console.error(m) });
writeFileSync(path.join(OUT, 'council.json'), JSON.stringify({ started, ended: new Date().toISOString(),
  protocol: 'skills/fabius-concilium/references/council.mjs (fabius 3.2.0, unchanged)', transport: 'Claude Code -p, no tools, clean settings',
  result, transcript }, null, 1));
console.log(JSON.stringify({ seats: result.seats, chairman: result.chairman, calls: result.call_accounting, leaderboard: result.leaderboard }, null, 1));
