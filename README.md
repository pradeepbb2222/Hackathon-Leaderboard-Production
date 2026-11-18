# CodeBharat 2026 floor app

This is the live leaderboard and operations desk for CodeBharat 2026. Squads submit work. Judges score. A projector shows the table. It updates by itself.

The owner does not need to code. Hand these guides to the person who will set it up.

## Which guide to open

1. [Deploy on Railway + Cloudflare R2](docs/DEPLOY_GUIDE.md) — the recommended way. No server to babysit.
2. [Deploy on the college's own Linux server](docs/SELF_HOSTED_SERVER_GUIDE.md) — Docker, Postgres, MinIO, and HTTPS.
3. [The database](docs/DATABASE_GUIDE.md) — what is stored, backups, and how to reset before the real event.
4. [Event day](docs/EVENT_DAY_RUNBOOK.md) — import squads, print passes, start the clock, use the projector.
5. [When something breaks](docs/TROUBLESHOOTING.md).
6. [Organizer](docs/ADMIN_USER_GUIDE.md), [squad](docs/TEAM_USER_GUIDE.md), and [judge](docs/JUDGE_USER_GUIDE.md) — short how-tos.

## What you must decide

- Where the app runs: Railway, or a college server.
- Where files live: Cloudflare R2 (recommended) or MinIO on the college server.
- The public name, for example `live.codebharat.sasa.engineer` or `leaderboard.iiitdwd.ac.in`.
- The organizer's first password (`ADMIN_PASSWORD`). They change it at first login.
- A long random `SESSION_SECRET`. Do not reuse the sample text.

Demo simulation starts **off**. Leave it off on event day. It is only a rehearsal switch on the organizer screen.

The fake 150-squad data is **not** loaded on start. Run `npm run seed:demo` only on a practice database.

## Commands the deployer will use

```bash
npm install
npm run build
npx prisma migrate deploy
npm run seed:production
npm start
```

The app listens on `0.0.0.0` and port `4317` unless `PORT` is set. Opening it in a browser uses whatever public name the proxy has. Nothing in the app is stuck to `localhost`.
