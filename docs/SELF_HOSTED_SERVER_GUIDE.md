# Run it on the college server

Use this when the organizer's own Linux server will host the site. The tested layout is Ubuntu 22.04 or 24.04. The ready file is `docker-compose.prod.yml`. It starts four pieces:

- the app
- PostgreSQL (the database)
- MinIO (files on the server's disk, same idea as S3). The compose file uses `bitnamilegacy/minio` because Docker Hub no longer serves the old `minio/minio` name.
- Caddy (HTTPS)

You can swap MinIO for Cloudflare R2. You can swap Caddy for the college Nginx. Both are explained below.

If you would rather not run a server, use [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md).

## 1. How big the server should be

For about 150 squads and 8–10 GB of files:

- **CPU:** 2 cores is enough. 4 is more comfortable on event day.
- **RAM:** 4 GB minimum. 8 GB is safer when many people are on the site.
- **Disk:** 40 GB free minimum. Use 80 GB if you can, so backups fit next to the files.
- **Network:** the laptops in the hall must reach the website and the file port (or the file hostname).

## 2. What to ask the college IT team

Send them this list:

1. A Linux server (Ubuntu 22.04 or 24.04) with the size in section 1.
2. An SSH login for the student who will deploy.
3. A public IP address, **or** their reverse proxy pointed at this server.
4. Ports **80** and **443** open from the internet (or from the campus network if the site is intranet-only).
5. Port **9000** open to the hall network if you use MinIO and browsers upload straight to it.
6. A DNS name. Examples:
   - `leaderboard.iiitdwd.ac.in` as an **A record** to the server's IP.
   - `live.codebharat.sasa.engineer` as an **A record** to the IP, or a **CNAME** if IT gives you a hostname instead of an IP.

If the server has no public IP, use the last section of this guide.

## 3. Install Docker

On the server:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in so the group change applies. Check:

```bash
docker compose version
```

## 4. Put the code on the server

```bash
git clone <the repository url>
cd <the project folder>
cp deploy/.env.prod.example deploy/.env.prod
```

Edit `deploy/.env.prod`:

1. Change `POSTGRES_PASSWORD`.
2. Change `MINIO_ROOT_PASSWORD`.
3. Change `SESSION_SECRET` to a long random string. Do not leave the sample text.
4. Change `ADMIN_PASSWORD` to the organizer's temporary password.
5. Set `S3_PUBLIC_ENDPOINT` to `http://YOUR.SERVER.IP:9000` so laptops can upload.
6. For a public name with HTTPS, set `SITE_ADDRESS=leaderboard.iiitdwd.ac.in` and `COOKIE_SECURE=true`.
7. For a test on the server itself, leave `SITE_ADDRESS=http://`.

## 5. Start it

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml up -d --build
```

The first build takes several minutes. Watch it:

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml logs -f app
```

Wait until the app logs say it is ready. Migrations run automatically on start. They do not delete data.

## 6. Create the organizer

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml exec app npm run seed:production
```

Open the site. Sign in. The app asks for a new password. Save it.

Do not run `npm run seed:demo` here unless this is a throwaway practice database.

## 7. Domain names

**A record** (the name points at an IP), for `leaderboard.iiitdwd.ac.in`:

| Type | Name | Value |
| --- | --- | --- |
| A | `leaderboard` | the server's public IP |

**CNAME or A** for `live.codebharat.sasa.engineer`:

| Type | Name | Value |
| --- | --- | --- |
| A | `live` | the server's public IP |

If IT uses CNAME instead, the name is still `live` and the value is the hostname they gave you.

Then set in `deploy/.env.prod`:

```bash
SITE_ADDRESS=leaderboard.iiitdwd.ac.in
COOKIE_SECURE=true
```

Restart:

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml up -d
```

Caddy asks Let's Encrypt for a certificate. Ports 80 and 443 must be open. The first try can fail if DNS is not ready yet. Wait 15 minutes and restart Caddy:

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml restart caddy
```

## 8. Use the college Nginx instead of Caddy

If IT already terminates HTTPS, stop Caddy and let Nginx talk to port 4317.

1. Publish the app port. In `docker-compose.prod.yml` the app is private. Add under `app`:

```yaml
    ports:
      - "127.0.0.1:4317:4317"
```

2. Stop Caddy: `docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml stop caddy`
3. Give IT the file `deploy/nginx.conf.sample`.
4. That file turns buffering off for `/api/live/stream` so the projector updates live. It also allows uploads up to 30 MB.
5. Set `COOKIE_SECURE=true` because users still see HTTPS.

## 9. Use Cloudflare R2 instead of MinIO

1. Create the bucket and token as in [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md).
2. In `deploy/.env.prod` set:

```bash
STORAGE_DRIVER=s3
S3_ENDPOINT=https://ACCOUNT.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://ACCOUNT.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=codebharat
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
```

3. You can leave the MinIO container running or stop it. The app will not use it when those variables point at R2.
4. Put the website origin in the R2 CORS JSON from the deploy guide.

## 10. Backups every day

The script is `scripts/backup.sh`. It writes a database dump and a copy of the MinIO disk into `backups/`.

Test it once:

```bash
sh scripts/backup.sh
```

Add it to cron. Example, every day at 02:10:

```bash
crontab -e
```

```cron
10 2 * * * cd /path/to/the/project && sh scripts/backup.sh >> backups/backup.log 2>&1
```

Keep a copy off the server (a USB disk or another machine) the day before the event. How to restore is in [DATABASE_GUIDE.md](DATABASE_GUIDE.md).

## 11. Update to a new version

```bash
git pull
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml up -d --build
```

Migrations run again. Your squads and files stay.

## 12. Logs and reboots

```bash
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml ps
docker compose --env-file deploy/.env.prod -f docker-compose.prod.yml logs --tail 100 app
```

`restart: unless-stopped` is set. After a reboot, Docker starts the stack if Docker itself starts. Enable that with `sudo systemctl enable docker`.

## 13. Check the site

1. Open the public name. The leaderboard loads.
2. `/api/health` shows `"database":"ok"` and `"storage":"ok"`.
3. Sign in as the organizer and change the password.
4. Upload a file as a test squad. It should appear in MinIO (port 9000) or in R2.
5. Open `/tv` on the projector machine.

## 14. Intranet only (no public IP)

Use this when the site is only for the campus network.

1. Set `SITE_ADDRESS=http://` and `COOKIE_SECURE=false`.
2. Do not open the server to the whole internet.
3. Ask IT for a campus DNS name, or share the server IP: `http://10.x.x.x`.
4. Set `S3_PUBLIC_ENDPOINT` to `http://10.x.x.x:9000` so laptops on that network can upload.
5. Skip Let's Encrypt. Caddy serves plain HTTP.
6. Tell the hall to use the `http://` address, not `https://`.
