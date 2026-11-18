# Troubleshooting

## The site does not open

1. Check the app is running. On Railway, the deployment should be green. On a server, `docker compose ps` should show `app` as running.
2. Open `/api/health`.
3. If the page times out, the domain DNS is not pointing at the host yet. Wait and try the Railway or server IP URL.

## Health says database is down

`DATABASE_URL` is wrong, or Postgres is stopped. Copy the URL again from Railway or check the `postgres` container. The URL must start with `postgresql://`.

## Health says storage is down

The file store rejected the app.

1. `STORAGE_DRIVER` must be `s3` in production.
2. Bucket name, keys, and endpoint must match the token.
3. For MinIO, the bucket must exist. The compose file creates it on startup. Read `docker compose logs minio-init`.
4. For R2, `S3_REGION=auto` and `S3_FORCE_PATH_STYLE=true`.

## Sign-in says the credentials were not recognized

1. The production seed may not have been run. Run `npm run seed:production`.
2. Caps matter in the password.
3. After five or so bad tries, wait. The message tells you how many seconds.

## It keeps asking to change the password

That is the first-login rule for the organizer. Set a new password of at least 8 characters. It must be different from the temporary one.

## A squad upload fails

1. The gate must be open, or it will be marked late. If the sprint has not started, uploads are refused.
2. PDF, PowerPoint, ZIP, PNG, JPG, WEBP, or GIF only.
3. Default max is 25 MB. Default squad cap is 500 MB.
4. The browser must be able to reach `S3_PUBLIC_ENDPOINT`. If that URL uses `minio` or `localhost`, a laptop in the hall cannot use it. Set it to the server IP or a real file hostname.
5. CORS must allow the website. See [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md).

## The projector table does not move

1. The tab must stay open.
2. Nginx or another proxy must not buffer `/api/live/stream`. See `deploy/nginx.conf.sample`.
3. **Freeze leaderboard** stops the order from changing.
4. Demo simulation is not required for real updates. Real squad saves move the table.

## Cookies do not stick on HTTPS

The proxy must send `X-Forwarded-Proto: https` and `X-Forwarded-Host`. If it cannot, set `COOKIE_SECURE=true`.

## I ran the demo seed by mistake

`npm run seed:demo` adds fake squads. It does not delete real ones if any squad already exists. If the database was empty, it filled it with practice data. Restore a backup, or reset using [DATABASE_GUIDE.md](DATABASE_GUIDE.md).

## Restart did not wipe the event

That is correct. Restarts keep the data. Migrations only add structure.
