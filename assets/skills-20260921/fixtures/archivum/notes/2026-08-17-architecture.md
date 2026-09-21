# Harbor — architecture review, 2026-08-17

Attendees: Noa, Eitan, Maya

Maya's research: harbormasters lose signal on the outer piers for 20–40 minutes at a time. Arrivals must be recorded offline and synced later.

Decisions
- Offline mode is required for the arrivals board.
- Keep Postgres on the server; add a local cache on the device. (Eitan)
- Payments: we will evaluate two providers; decision by 2026-09-01. Owner: Noa.

Open
- Conflict resolution when two devices record the same arrival.
