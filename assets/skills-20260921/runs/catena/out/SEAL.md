# Seal for `release/`

This seals the four files in `release/` (`CHANGELOG.md`, `LICENSE.txt`, `README.md`,
`app.js`) so that anyone, at any later time, can independently check that the exact
bytes they have match what we published and signed. No network or third-party
service is used or required to verify.

## What this proves, and what it does not

- **Proves:** these exact bytes, under these exact relative paths, were hashed into
  the recorded Merkle root, and that root was signed by the private key matching the
  bundled public key. Changing any byte of any sealed file, renaming a file, adding
  an unlisted file, or removing a sealed file all break verification.
- **Does not prove:** *when* this was created, beyond the local system clock we
  recorded (see **Timestamp status** below), or who the key belongs to in the real
  world (this is a demo key pair with no external identity binding — for a real
  release you would publish the public key fingerprint somewhere independently
  verifiable, e.g. a signed commit, a website, a keyserver).

## Scheme

**Leaf hash** (one per file), matching the task's spec exactly:

```
leaf(file) = SHA-256( UTF-8(relativePath) || 0x00 || fileBytes )
```

**Merkle tree**, built over leaves sorted by path:

```
level[0]  = [leaf_1, leaf_2, ..., leaf_n]   (sorted by path)
level[i+1][k] = SHA-256( level[i][2k] || level[i][2k+1] )
                (if level[i] has an odd number of nodes, the last node is duplicated
                 to pair with itself)
root = the single digest left after repeating this until one digest remains
```

Concatenation at each tree level is over the **raw digest bytes**, not hex strings.

**Signature:** the 32-byte root is signed with **Ed25519** (`node:crypto`'s
`sign(null, root, privateKey)` — Ed25519 has no separate digest algorithm parameter).

This scheme uses only primitives with native or straightforward Web Crypto /
`noble-curves`-class support (SHA-256, Ed25519, pairwise hash concatenation), so a
browser-side reimplementation of `verify.mjs`'s logic is a translation exercise, not
a new design — nothing here depends on a Node-specific API.

## Files produced

```
out/keys/ed25519-private.pem   demo private key. Never printed, never in the bundle. 0600 perms.
out/keys/ed25519-public.pem    demo public key (also embedded in manifest.json).
out/build-seal.mjs             the script that builds the bundle below (not needed to verify).
out/bundle/manifest.json       per-file paths + leaves, the root, the public key, the signature,
                                and an honest timestamp status. This + verify.mjs is the whole
                                offline verification bundle - copy both anywhere and it still works.
out/bundle/verify.mjs          the offline verifier. `node verify.mjs <path-to-release-dir>`.
out/tamper-test/release-tampered/  a copy of release/ with one byte flipped in app.js, to
                                demonstrate detection.
```

## Timestamp status — recorded honestly

**Status: unanchored.** This environment has no network access, so no OpenTimestamps
calendar and no Bitcoin anchor was reachable or attempted. `manifest.json` records
`timestamp.sealedAtLocalClock`, which is **only the local system clock** at signing
time (`2026-09-21T16:30:43.625Z` per this run) — it is not cryptographically anchored,
it is trivially backdatable by anyone who controls the clock, and it must not be
treated as proof of when the root existed. The signature and the Merkle root stand on
their own regardless: they prove *possession of the private key* and *exact-byte
binding*, not *when*. To upgrade this to an un-backdatable existence proof, run the
root through OpenTimestamps → Bitcoin once network access is available, and add the
resulting proof file to the bundle (see `references/sealing.md` in this skill for the
anchoring step) — that is additive and does not require re-signing.

## Verification: passing

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
exit=0
```

## Verification: tamper detection

A copy of `release/` was made at `out/tamper-test/release-tampered/` and one byte was
flipped in `app.js` (the leading `'` of `'use strict';` became `&`):

```
$ diff release/app.js out/tamper-test/release-tampered/app.js
1c1
< 'use strict';
---
> &use strict';
```

Verifying that copy against the same bundle:

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
exit=1
```

Note that "signature valid for root under bundled public key" still shows **PASS**
here — that check only confirms the *manifest's own* recorded root was validly signed
(it was, and that record is untouched). The tampering is caught by the checks that
recompute from the actual on-disk bytes: the per-file content hash and the
recomputed Merkle root both diverge from what was signed, so the overall result is
still correctly `INVALID`. This is why a verifier needs both legs, not the signature
alone.

The verifier was also checked against an added unlisted file and a removed sealed
file (both fail on the **set membership** checks specifically, before content is even
compared) — this matters because a verifier that only re-hashes files it already
knows about is blind to a file quietly added to the release after sealing.

## How to verify this later, on any machine with Node

```
node out/bundle/verify.mjs /path/to/release
```

`manifest.json` and `verify.mjs` together are the entire trust root needed — no
other file in this repo is required for verification.
