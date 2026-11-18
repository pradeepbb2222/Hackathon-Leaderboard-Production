# Database guide

The database is PostgreSQL. It holds the accounts, squads, gate updates, scores, announcements, and the audit log. The files themselves live in R2 or MinIO. The database only stores the file name, size, and storage key.

## What each table is for

- **User** — logins for the organizer, squads, and judges. Passwords are hashed. A copy of the issued squad password is kept so you can print passes again.
- **Team** — squad name, college, track, members, and whether they are a finalist.
- **Judge** and **JudgeAssignment** — who scores which squad.
- **Milestone** — the five gates and when they open and close.
- **Submission** and **SubmissionRevision** — the text, progress, links, and history.
- **SubmissionFile** — one row per uploaded file.
- **JudgeScore** — draft or submitted marks. Drafts do not move the leaderboard.
- **Announcement** — broadcasts.
- **AuditLog** — organizer actions (imports, locks, password resets, downloads).
- **EventState** — the clock, weights, locks, and whether the board is frozen.
- **RankMemory** — the previous rank, so the arrows can show movement.

## Look at the data

**Railway:** open the Postgres service and use the Data tab. You can read rows there. Do not delete rows during the event unless you are sure.

**On your laptop:** from the project folder, with `DATABASE_URL` set:

```bash
npx prisma studio
```

A browser opens. Edit one row at a time. Do not wipe a table.

## Take a backup

On Railway, use the database backup button if the plan has one. Also take your own dump the day before the event.

```bash
pg_dump "$DATABASE_URL" | gzip > codebharat-backup.sql.gz
```

On the college server:

```bash
sh scripts/backup.sh
```

That writes `backups/db-....sql.gz` and `backups/files-....tar.gz`.

## Restore a backup

Stop the app first so nobody writes during the restore.

```bash
gunzip -c codebharat-backup.sql.gz | psql "$DATABASE_URL"
```

On the college server, for the database file from `scripts/backup.sh`:

```bash
gunzip -c backups/db-YYYY-MM-DD.sql.gz | docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml exec -T postgres psql -U codebharat codebharat
```

Restoring files means unpacking `files-....tar.gz` back into the MinIO volume, or re-uploading objects to R2. Do a restore drill once before the event.

## Reset between rehearsal and the real event

1. Take a backup of the rehearsal, in case you want it later.
2. Do **not** run `npm run seed:demo` on the real database.
3. The clean way: create a new empty Postgres database (or drop and recreate the schema), run `npx prisma migrate deploy`, then `npm run seed:production`.
4. On the college server, a simple reset is to remove the Docker volumes and start again. This deletes squads and files.

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml down -v
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml up -d
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml exec app npm run seed:production
```

Only do this when you mean to erase the rehearsal.

## Export results

1. Sign in as the organizer.
2. Open **Squads** and use **Export credentials** if you need logins.
3. Open **Audit** to see what happened.
4. The leaderboard is the ranking. Freeze it before you export if judging is finished.
5. A full data dump is the `pg_dump` command above.
