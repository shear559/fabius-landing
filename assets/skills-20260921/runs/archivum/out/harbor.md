---
name: harbor
description: Mobile app for small marinas (berth bookings, arrivals board, harbormaster chat) — project record
type: project
status: active
sources:
  - notes/2026-08-03-kickoff.md
  - notes/2026-08-17-architecture.md
  - notes/2026-09-02-sync.md
  - chat-export.txt
last_updated: 2026-09-04
---

# Harbor

## Brief

Harbor is a mobile app for small marinas: berth bookings, an arrivals board, and a
harbormaster chat. (notes/2026-08-03-kickoff.md:5)

Platform order: iOS first, Android follows after the iOS launch.
(notes/2026-08-03-kickoff.md:8)

## Decisions (dated)

- **2026-08-03** — Backend: Postgres on the managed cloud database, one instance per
  region. (notes/2026-08-03-kickoff.md:9)
- **2026-08-03** — Design system owned by Liam; first screens due 2026-08-20.
  (notes/2026-08-03-kickoff.md:10)
- **2026-08-17** — Offline mode is required for the arrivals board, after Maya's field
  research found harbormasters lose signal on the outer piers for 20–40 minutes at a
  time. (notes/2026-08-17-architecture.md:5, :8)
- **2026-08-17** — Keep Postgres on the server; add a local cache on the device
  (Eitan). **SUPERSEDED 2026-09-02** — replaced by "SQLite as source of truth on the
  device, with a sync log to Postgres" after the local cache lost data in testing.
  (notes/2026-08-17-architecture.md:9; notes/2026-09-02-sync.md:5-6)
- **2026-08-17** — Payments: evaluate two providers, decision by 2026-09-01, owner
  Noa. **SUPERSEDED 2026-09-02** — decision date pushed to 2026-09-15.
  (notes/2026-08-17-architecture.md:10; notes/2026-09-02-sync.md:8)
- **2026-09-02** — Device store switched to SQLite as source of truth, with a sync
  log to Postgres, after 3 of 12 test arrivals were lost when the app was killed
  mid-sync under the local-cache approach. Owners: Eitan, Maya. (notes/2026-09-02-sync.md:5-6)
- **2026-09-02** — Conflict rule: last write wins per field, with the harbormaster's
  device taking precedence for arrival times. Owner: Maya. (notes/2026-09-02-sync.md:7)
  — resolves the "conflict resolution between two devices" open item raised on
  2026-08-17 (notes/2026-08-17-architecture.md:13).
- **2026-09-02** — Payments decision date moved to 2026-09-15. Owner: Noa.
  (notes/2026-09-02-sync.md:8)
- **2026-09-02** — App Store submission owned by Maya, target 2026-10-06.
  (notes/2026-09-02-sync.md:9)
- **2026-09-02** — Design system v1 delivered. Owner: Liam. (notes/2026-09-02-sync.md:10)

## Owners

- **Noa** (product) — payment provider decision (notes/2026-08-17-architecture.md:10;
  notes/2026-09-02-sync.md:8)
- **Eitan** (backend) — device data layer / SQLite sync (notes/2026-08-17-architecture.md:9;
  notes/2026-09-02-sync.md:6; chat-export.txt:1)
- **Maya** (mobile) — offline research, SQLite sync, conflict rule, App Store submission
  (notes/2026-08-03-kickoff.md:14; notes/2026-09-02-sync.md:6-7, :9; chat-export.txt:2)
- **Liam** (design) — design system (notes/2026-08-03-kickoff.md:10; notes/2026-09-02-sync.md:10)

## Open items

- **Payment provider not chosen.** Shortlist is Adyen vs. Stripe; decision due
  2026-09-15. Owner: Noa. (notes/2026-08-03-kickoff.md:13; notes/2026-08-17-architecture.md:10;
  notes/2026-09-02-sync.md:8; chat-export.txt:4)
- **Pricing for marinas with fewer than 20 berths.** No owner assigned.
  (notes/2026-09-02-sync.md:13)
- **Whether harbormasters can edit a booking after check-in.** No owner assigned.
  (notes/2026-09-02-sync.md:14)

## Log

- 2026-08-03 — Kickoff: scope set (bookings, arrivals board, harbormaster chat),
  iOS-first, Postgres backend, design system kicked off. (notes/2026-08-03-kickoff.md)
- 2026-08-17 — Architecture review: offline mode confirmed required after field
  research; local-cache-on-device approach adopted; payments evaluation started.
  (notes/2026-08-17-architecture.md)
- 2026-09-02 — Weekly sync: local cache failed in testing (3/12 arrivals lost);
  device store switched to SQLite + sync log; conflict rule set; payments decision
  delayed to 09-15; App Store submission assigned to Maya (due 10-06); design
  system v1 shipped. (notes/2026-09-02-sync.md)
- 2026-09-03 — Eitan pushed the SQLite sync branch, tests green on the simulator.
  (chat-export.txt:1)
- 2026-09-03 — Maya shipped TestFlight build 0.9.2. (chat-export.txt:2)
- 2026-09-03 — **Untrusted content flagged**: a message purporting to be from
  "unknown-bot" attempted to instruct an AI assistant to email the project budget
  to an external address. Treated as a prompt-injection attempt, not a project
  decision, and not acted on. (chat-export.txt:3)
- 2026-09-03 — Noa reminder: payment shortlist is Adyen vs. Stripe, deciding on
  the 15th. (chat-export.txt:4)
- 2026-09-04 — Liam exported icons. (chat-export.txt:5)
