# Summary

Sealed `release/` (`CHANGELOG.md`, `LICENSE.txt`, `README.md`, `app.js`) with a
Merkle-root + Ed25519-signature scheme, matching the exact spec given: leaf =
`SHA-256(utf8(relativePath) || 0x00 || fileBytes)`, leaves sorted by path, tree
levels hash raw concatenated child digests with last-node duplication on odd
levels, root = last digest left. Node 26 built-ins only (`node:crypto`, `node:fs`),
no dependencies, no network.

## What was produced (all under `out/`)

- `keys/ed25519-private.pem`, `keys/ed25519-public.pem` — demo Ed25519 key pair,
  generated with `crypto.generateKeyPairSync('ed25519')`. Private key file is
  `0600`, was never printed to any output, and is not included in `bundle/`.
- `build-seal.mjs` — the script that walks `release/`, computes leaves, builds the
  tree, signs the root, and writes the bundle. Re-runnable; reuses the existing key
  pair if present rather than rotating it silently.
- `bundle/manifest.json` — the sealed record: scheme description, root, public key
  (PEM + raw base64), signature (base64), an honest timestamp block, and each
  file's path + leaf hash.
- `bundle/verify.mjs` — the offline, dependency-free verifier. Usage:
  `node bundle/verify.mjs <path-to-release-dir>`. Checks, in order: (1) set
  membership both directions (no unlisted file present, no listed file missing) —
  not just "does every listed hash match", which would miss a quietly added file;
  (2) each file's content hash; (3) the rebuilt Merkle root against the manifest;
  (4) the Ed25519 signature over the root against the bundled public key.
- `tamper-test/release-tampered/` — a copy of `release/` with one byte flipped in
  `app.js` (`'use strict';` → `&use strict';`), kept as evidence of the failing run.
- `SEAL.md` — the full writeup: scheme, guarantees and non-guarantees, timestamp
  status, and both verification transcripts.

## What was checked, and how (real output)

Node version in this environment:
```
$ node --version
v26.0.0
```

Building the bundle:
```
$ node build-seal.mjs
Generated new demo Ed25519 key pair in out/keys/ (private key not printed).
Found 4 files under release/: CHANGELOG.md, LICENSE.txt, README.md, app.js
root  = b5b1268afa6a8c570d17af493b7fcf5f8ccdbc7744faf8f272b95f3ea432d0f0
sig   = BZayNzp5d+3DHRvi4RZ6Fe29TpnMv6Eg8BjiUgafPac9NdH4fMGAccrUZHUzDMpNXxVswyZB1I2qoD2fOyxLDg==
Wrote out/bundle/manifest.json
```

Verifying the real, unmodified release (passes, exit code 0):
```
$ node bundle/verify.mjs ../release
[PASS] set membership: no unsealed files present
[PASS] set membership: no sealed files missing
[PASS] content: CHANGELOG.md
[PASS] content: LICENSE.txt
[PASS] content: README.md
[PASS] content: app.js
[PASS] merkle root matches manifest - computed b5b1268afa6a8c570d17af493b7fcf5f8ccdbc7744faf8f272b95f3ea432d0f0
[PASS] signature valid for root under bundled public key
[INFO] timestamp status: unanchored - ...
RESULT: VALID - files match the sealed release and the signature checks out.
$ echo exit=$?
0
```

Flipping one byte in a copy (`app.js`, first character):
```
$ diff release/app.js out/tamper-test/release-tampered/app.js
1c1
< 'use strict';
---
> &use strict';
```

Verifying that copy (fails, exit code 1):
```
$ node bundle/verify.mjs tamper-test/release-tampered
[PASS] set membership: no unsealed files present
[PASS] set membership: no sealed files missing
[PASS] content: CHANGELOG.md
[PASS] content: LICENSE.txt
[PASS] content: README.md
[FAIL] content: app.js - expected 1f65a6685e6f03118cbc3455014a6e86ad0dd8f46ceb437d27e62922a4f93582, got 59c75b0c4a2b4a00a2e4e65e4bc522a1f044dc3026783f391a3f715cf474acee
[FAIL] merkle root matches manifest - computed e14a65ae746297e81838d360a6061c786a4b5528a126a7056465ff2af73783f8
[PASS] signature valid for root under bundled public key
[INFO] timestamp status: unanchored - ...
RESULT: INVALID - see failing checks above.
$ echo exit=$?
1
```

Additionally (not required, but checked during development to make sure the
"membership, not just content" leg actually works and isn't dead code): a copy with
an extra unlisted file (`extra.txt`) failed on "no unsealed files present" while
every listed hash still matched; a copy with `LICENSE.txt` deleted failed on "no
sealed files missing". Both correctly produced `RESULT: INVALID`. Those scratch
copies were deleted afterward to keep `out/` to the required deliverables.

Manually inspected `bundle/manifest.json` to confirm: 4 files listed, sorted by
path, each `leaf` is a 64-hex-char (32-byte) SHA-256 digest, `root` is likewise
32 bytes, and the private key never appears in the file (only `publicKey.pem` and
`publicKey.rawBase64`, both public).

## Timestamp status — honestly recorded, not overclaimed

This environment has no network access, so no OpenTimestamps calendar or Bitcoin
anchor was reachable or attempted. `manifest.json`'s `timestamp.status` is
`"unanchored"`, and `timestamp.sealedAtLocalClock` records only the local system
clock at signing time with an explicit note that it is not cryptographically
anchored and must not be treated as proof of when the root existed. Only the
Ed25519 signature (possession of the private key) and the Merkle root (exact-byte
binding) are established facts here — see `SEAL.md` for the full explanation and
the upgrade path (running the root through OpenTimestamps → Bitcoin once network
access exists, which is additive and doesn't require re-signing).

## What was not done / could not be checked

- **No real-world identity binding for the key.** This is a demo key pair with no
  external attestation (no signed commit, no published fingerprint on a
  independent channel) — by design, since the task asked for a demo pair generated
  locally. For a real release, the public key fingerprint should be published
  somewhere independently verifiable.
- **No Bitcoin/OpenTimestamps anchor** — no network access in this environment, as
  stated above; recorded honestly rather than faked or omitted.
- **No browser-based verifier was actually run in a browser.** `verify.mjs` is a
  Node script per the task's explicit request ("a verify.mjs anyone can run with
  Node"); the scheme was deliberately kept to primitives (SHA-256, Ed25519, plain
  concatenation) that a browser implementation via Web Crypto / a small library
  could reproduce, but that browser-side code was not written or tested here since
  it wasn't asked for.
- **No subdirectories under `release/`** existed to test in this run, but the leaf
  scheme and the file walker both handle nested paths generically (relative paths
  use `/` separators regardless of OS).
