/fabius:fabius-catena Seal the release in release/ so that anyone can check later that these exact files came from us. Use this scheme so a browser can recheck it: a file's leaf is SHA-256 over its UTF-8 relative path, one zero byte, then the file's bytes; leaves are sorted by path; each tree level hashes the concatenation of two child digests (raw bytes), duplicating the last digest when a level is odd; the root is the last digest left.

Sign the root with an Ed25519 key using Node's built-in crypto. Generate a demo key pair into out/keys/, never print the private key, and never put it in the bundle. Produce an offline verification bundle in out/bundle/: manifest.json with each file's path and leaf, the root, the public key and the signature, plus a verify.mjs anyone can run with Node. There is no network here, so no timestamp service is reachable: record the timestamp status honestly. Show verification passing, then show that changing one byte in a copy makes it fail. Write out/SEAL.md.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
