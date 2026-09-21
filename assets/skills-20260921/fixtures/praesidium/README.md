# invoices

Small invoice service for the studio. `node server.js` starts it on :3000; `node --test` runs the tests.

- `GET /api/invoices/:id` — invoice JSON (Bearer token required)
- `GET /download?file=<name>` — download a receipt from files/receipts
- `POST /api/avatar-from-url` — `{ "imageUrl": "https://…" }` fetches an image for the user's avatar

Ships to production on Friday.
