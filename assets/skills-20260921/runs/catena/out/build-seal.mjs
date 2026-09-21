#!/usr/bin/env node
// Builds the seal for ../release: generates a demo Ed25519 key pair (if absent),
// computes the Merkle tree over release/, signs the root, and writes the
// offline verification bundle to ./bundle/. Run once from `out/`:
//   node build-seal.mjs
//
// Leaf scheme:  SHA-256( utf8(relativePath) || 0x00 || fileBytes )
// Tree scheme:  leaves sorted by path; each level hashes concat(left, right)
//               raw digest bytes, duplicating the last node when a level is odd;
//               the root is the last digest left.

import { createHash, generateKeyPairSync, sign as edSign } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, chmodSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT_DIR = HERE;
const KEYS_DIR = path.join(OUT_DIR, 'keys');
const BUNDLE_DIR = path.join(OUT_DIR, 'bundle');
const RELEASE_DIR = path.join(OUT_DIR, '..', 'release');

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
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  })(root);
  return out;
}

function leafFor(relPath, fileBytes) {
  return sha256(Buffer.from(relPath, 'utf8'), Buffer.from([0x00]), fileBytes);
}

function merkleRoot(sortedLeafBuffers) {
  if (sortedLeafBuffers.length === 0) throw new Error('no files to seal');
  let level = sortedLeafBuffers;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last if odd
      next.push(sha256(left, right));
    }
    level = next;
  }
  return level[0];
}

// 1. Demo key pair (generate once; never printed; never copied into bundle/)
mkdirSync(KEYS_DIR, { recursive: true });
const privPath = path.join(KEYS_DIR, 'ed25519-private.pem');
const pubPath = path.join(KEYS_DIR, 'ed25519-public.pem');

let publicKeyPem;
let privateKeyPem;
if (existsSync(privPath) && existsSync(pubPath)) {
  privateKeyPem = readFileSync(privPath, 'utf8');
  publicKeyPem = readFileSync(pubPath, 'utf8');
  console.log('Reusing existing demo key pair in out/keys/.');
} else {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  writeFileSync(privPath, privateKeyPem, { mode: 0o600 });
  writeFileSync(pubPath, publicKeyPem, { mode: 0o644 });
  chmodSync(privPath, 0o600);
  console.log('Generated new demo Ed25519 key pair in out/keys/ (private key not printed).');
}

// Raw 32-byte public key, for verifiers that want it without PEM parsing.
const { createPublicKey } = await import('node:crypto');
const pubKeyObj = createPublicKey(publicKeyPem);
const rawPublicKey = pubKeyObj.export({ type: 'spki', format: 'der' }).subarray(-32);

// 2. Walk release/, compute per-file leaves, sort by relative path
const absoluteFiles = listFilesRecursive(RELEASE_DIR);
const files = absoluteFiles
  .map((abs) => {
    const rel = path.relative(RELEASE_DIR, abs).split(path.sep).join('/');
    const bytes = readFileSync(abs);
    return { path: rel, leafBuf: leafFor(rel, bytes) };
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

console.log(`Found ${files.length} files under release/:`, files.map((f) => f.path).join(', '));

// 3. Merkle root over sorted leaves
const root = merkleRoot(files.map((f) => f.leafBuf));

// 4. Sign the root with Ed25519 (crypto.sign with algorithm=null for EdDSA)
const signature = edSign(null, root, { key: privateKeyPem });

// 5. Honest timestamp status: no network here, so no OpenTimestamps/Bitcoin anchor.
const sealedAt = new Date().toISOString();

const manifest = {
  version: 1,
  scheme: {
    leaf: 'SHA-256(utf8(relativePath) || 0x00 || fileBytes)',
    tree: 'pairwise SHA-256 of raw child digests, sorted leaves by path, duplicate last node when odd, root = last digest left',
    signature: 'Ed25519 over the raw 32-byte Merkle root',
  },
  root: root.toString('hex'),
  publicKey: {
    format: 'spki-pem',
    pem: publicKeyPem,
    rawBase64: rawPublicKey.toString('base64'),
  },
  signature: {
    format: 'ed25519-raw',
    base64: signature.toString('base64'),
  },
  timestamp: {
    status: 'unanchored',
    sealedAtLocalClock: sealedAt,
    note:
      'No timestamp authority was reachable when this bundle was built (this environment has no network access, so OpenTimestamps/Bitcoin anchoring was not attempted). sealedAtLocalClock is only the local system clock at signing time; it is NOT cryptographically anchored, NOT un-backdatable, and MUST NOT be relied on as proof of when the root existed. Only the signature (possession of the private key) and the Merkle root (exact-byte binding) are established by this bundle.',
  },
  files: files.map((f) => ({ path: f.path, leaf: f.leafBuf.toString('hex') })),
};

mkdirSync(BUNDLE_DIR, { recursive: true });
writeFileSync(path.join(BUNDLE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const written = JSON.parse(readFileSync(path.join(BUNDLE_DIR, 'manifest.json'), 'utf8'));
for (const f of written.files) {
  if (typeof f.leaf !== 'string' || f.leaf.length !== 64) {
    throw new Error(`manifest.json leaf serialization broke for ${f.path}`);
  }
}

console.log('root  =', root.toString('hex'));
console.log('sig   =', signature.toString('base64'));
console.log('Wrote out/bundle/manifest.json');
