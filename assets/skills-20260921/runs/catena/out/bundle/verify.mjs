#!/usr/bin/env node
// Offline, self-contained verifier for a release sealed with manifest.json in this
// same directory. Needs nothing but Node's built-in `crypto` and `fs` - no network,
// no dependencies.
//
// Usage:
//   node verify.mjs <path-to-release-dir>
//
// Checks, in order:
//   1. Set membership: every file on disk is listed in the manifest, and every file
//      listed in the manifest is present on disk (an added or removed file fails here,
//      even if every *listed* hash still matches).
//   2. Content: recompute each file's leaf hash and compare to the manifest.
//   3. Structure: rebuild the Merkle root from the recomputed leaves and compare to
//      the manifest's root.
//   4. Authenticity: verify the Ed25519 signature over the root against the bundled
//      public key.
//
// Exit code 0 = all checks passed. Exit code 1 = any check failed.

import { createHash, verify as edVerify } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Usage: node verify.mjs <path-to-release-dir>');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(path.join(HERE, 'manifest.json'), 'utf8'));

function sha256(...buffers) {
  const h = createHash('sha256');
  for (const b of buffers) h.update(b);
  return h.digest();
}

function listFilesRecursive(root) {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  })(root);
  return out;
}

function leafFor(relPath, fileBytes) {
  return sha256(Buffer.from(relPath, 'utf8'), Buffer.from([0x00]), fileBytes);
}

function merkleRoot(sortedLeafBuffers) {
  if (sortedLeafBuffers.length === 0) throw new Error('no files to verify');
  let level = sortedLeafBuffers;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(sha256(left, right));
    }
    level = next;
  }
  return level[0];
}

let ok = true;
function check(label, pass, detail) {
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? ' - ' + detail : ''}`);
  if (!pass) ok = false;
}

// --- 1. Set membership: on-disk files vs manifest-listed files ---
const onDiskAbs = listFilesRecursive(targetDir);
const onDiskRel = new Set(onDiskAbs.map((abs) => path.relative(targetDir, abs).split(path.sep).join('/')));
const listedRel = new Set(manifest.files.map((f) => f.path));

const unsealedExtra = [...onDiskRel].filter((p) => !listedRel.has(p));
const missingFromDisk = [...listedRel].filter((p) => !onDiskRel.has(p));

check(
  'set membership: no unsealed files present',
  unsealedExtra.length === 0,
  unsealedExtra.length ? `found on disk but not in manifest: ${unsealedExtra.join(', ')}` : undefined,
);
check(
  'set membership: no sealed files missing',
  missingFromDisk.length === 0,
  missingFromDisk.length ? `listed in manifest but missing from disk: ${missingFromDisk.join(', ')}` : undefined,
);

// --- 2. Content: recompute each leaf ---
const recomputed = [];
for (const entry of manifest.files) {
  const abs = path.join(targetDir, ...entry.path.split('/'));
  let leafHex, err;
  try {
    const bytes = readFileSync(abs);
    leafHex = leafFor(entry.path, bytes).toString('hex');
  } catch (e) {
    err = e.message;
  }
  const match = !err && leafHex === entry.leaf;
  check(`content: ${entry.path}`, match, err ?? (match ? undefined : `expected ${entry.leaf}, got ${leafHex}`));
  recomputed.push({ path: entry.path, leaf: match ? entry.leaf : leafHex ?? '0'.repeat(64) });
}

// --- 3. Structure: rebuild Merkle root from recomputed leaves, sorted by path ---
const sorted = [...recomputed].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
const root = merkleRoot(sorted.map((f) => Buffer.from(f.leaf, 'hex')));
const rootHex = root.toString('hex');
check('merkle root matches manifest', rootHex === manifest.root, `computed ${rootHex}`);

// --- 4. Authenticity: Ed25519 signature over the root ---
const publicKeyPem = manifest.publicKey.pem;
const signature = Buffer.from(manifest.signature.base64, 'base64');
const sigValid = edVerify(null, Buffer.from(manifest.root, 'hex'), publicKeyPem, signature);
check('signature valid for root under bundled public key', sigValid);

// --- Timestamp status: report honestly, never treat as proof ---
console.log(`[INFO] timestamp status: ${manifest.timestamp.status} - ${manifest.timestamp.note}`);

console.log(ok ? '\nRESULT: VALID - files match the sealed release and the signature checks out.' : '\nRESULT: INVALID - see failing checks above.');
process.exit(ok ? 0 : 1);
