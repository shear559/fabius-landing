# Harbor — Answers

## 1. Which database does the device use now, and why did it change?

The device now uses **SQLite as the source of truth**, with a sync log up to
Postgres (notes/2026-09-02-sync.md:6: "switch the device store to SQLite as the
source of truth on the device, with a sync log to Postgres").

It changed because the previous approach — Postgres on the server with a local
cache on the device, decided 2026-08-17 (notes/2026-08-17-architecture.md:9:
"Keep Postgres on the server; add a local cache on the device. (Eitan)") —
**failed in testing**: 3 of 12 test arrivals were lost when the app was killed
mid-sync (notes/2026-09-02-sync.md:5: "The local cache approach failed in
testing: 3 of 12 test arrivals were lost when the app was killed mid-sync").
The 2026-09-02 note explicitly states this SQLite decision "replaces the
local-cache decision of 2026-08-17" (notes/2026-09-02-sync.md:6).

Postgres remains the server-side database, unchanged since kickoff
(notes/2026-08-03-kickoff.md:9: "Backend: Postgres on the managed cloud
database, one instance per region").

## 2. Who owns the App Store submission, and when is it due?

Maya owns the App Store submission, target date **2026-10-06**
(notes/2026-09-02-sync.md:9: "App Store submission: Maya owns it, target
2026-10-06").

## 3. What is still undecided, and who owns each item?

- **Payment provider.** Not yet chosen. Raised as open at kickoff
  (notes/2026-08-03-kickoff.md:13: "Payment provider not chosen."); narrowed to
  an evaluation of two providers on 2026-08-17 with a decision date of
  2026-09-01, owner Noa (notes/2026-08-17-architecture.md:10: "Payments: we
  will evaluate two providers; decision by 2026-09-01. Owner: Noa."); that date
  slipped to 2026-09-15 as of the 2026-09-02 sync (notes/2026-09-02-sync.md:8:
  "Payments: still evaluating; decision moved to 2026-09-15. Owner: Noa.");
  the shortlist is Adyen vs. Stripe per the 2026-09-03 chat
  (chat-export.txt:4: "reminder, payment provider shortlist is Adyen vs
  Stripe, deciding on the 15th"). **Owner: Noa.**
- **Pricing for marinas with fewer than 20 berths.** Listed as open with no
  owner named (notes/2026-09-02-sync.md:13: "Pricing for marinas with fewer
  than 20 berths."). **Owner: unassigned.**
- **Whether harbormasters can edit a booking after check-in.** Listed as open
  with no owner named (notes/2026-09-02-sync.md:14: "Whether harbormasters can
  edit a booking after check-in."). **Owner: unassigned.**

Note: the conflict-resolution question raised on 2026-08-17
(notes/2026-08-17-architecture.md:13: "Conflict resolution when two devices
record the same arrival.") is **not** still open — it was resolved by the
2026-09-02 decision that last write wins per field, with the harbormaster's
device taking precedence for arrival times (notes/2026-09-02-sync.md:7).
