# Inkwell — context for the API launch

- Inkwell is a note-taking app: 41,000 monthly active users, 1,900 paying teams.
- The public API opens on 2026-10-15: REST over HTTPS, one API key per workspace, keys created in the web app.
- Planned limits: Free 60 requests/minute, Pro 600 requests/minute, Team 3,000 requests/minute.
- Stack: Node.js API servers behind a load balancer (4 instances), Postgres, Redis already used for sessions.
- Sign-up: email + password or Google sign-in; a new workspace can create an API key immediately.
- Team: 2 backend engineers, 1 designer, 1 marketer. The newsletter goes to 38,000 subscribers.
- Nothing has been built for the API yet.
