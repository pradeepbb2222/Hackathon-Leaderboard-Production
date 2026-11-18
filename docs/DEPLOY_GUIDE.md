# Deploy guide

Use this if you want Railway to run the app and Cloudflare R2 to store files. You do not need a college server.

A second, shorter path (Render + Supabase) is at the bottom. For a machine you control, use [SELF_HOSTED_SERVER_GUIDE.md](SELF_HOSTED_SERVER_GUIDE.md).

Prices change. Check the current price on each site before you pay. R2's free tier is about 10 GB of storage. Extra storage is cheap for this event (on the order of a few US dollars for another 10 GB a month). Confirm the number on Cloudflare's R2 pricing page the week you deploy.

## 1. Accounts

1. Create a [GitHub](https://github.com) account if you do not have one. Put this project in a repository the deployer can open.
2. Create a [Railway](https://railway.com) account. Sign in with GitHub.
3. Create a [Cloudflare](https://dash.cloudflare.com) account.

## 2. Create the R2 bucket

1. In Cloudflare, open **R2 Object Storage**.
2. Choose **Create bucket**. Name it `codebharat`.
3. Open the bucket. Go to **Settings**.
4. Find **CORS policy**. Paste this JSON. Change the site name if yours is different.

```json
[
  {
    "AllowedOrigins": ["https://live.codebharat.sasa.engineer"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Add a second origin later if you also use a `www` name or a Railway preview URL.
6. Open **Manage R2 API Tokens**. Create a token that can read and write this bucket.
7. Write down the **Access Key ID**, the **Secret Access Key**, and the **S3 endpoint**. The endpoint looks like `https://<accountid>.r2.cloudflarestorage.com`. You cannot see the secret again.

## 3. Create the Railway project

1. In Railway, choose **New project**.
2. Choose **Deploy from GitHub repo**. Pick this repository.
3. Railway should see the `Dockerfile`. If it asks, choose Docker.
4. In the project, choose **New** then **Database** then **PostgreSQL**.
5. Open the Postgres service. Copy `DATABASE_URL`. It starts with `postgresql://`.

## 4. Set the variables

Open the **app** service, then **Variables**. Add each row.

| Name | Example | Where it comes from |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...` | Railway Postgres → Connect → `DATABASE_URL` |
| `SESSION_SECRET` | a long random string | Make one up. 32+ letters and numbers. Not the sample text. |
| `STORAGE_DRIVER` | `s3` | Type this exactly. |
| `S3_ENDPOINT` | `https://abc.r2.cloudflarestorage.com` | R2 API token page |
| `S3_PUBLIC_ENDPOINT` | same as `S3_ENDPOINT` | Same URL. Browsers upload here. |
| `S3_REGION` | `auto` | Type `auto` for R2. |
| `S3_BUCKET` | `codebharat` | The bucket name. |
| `S3_ACCESS_KEY_ID` | the key id | R2 token |
| `S3_SECRET_ACCESS_KEY` | the secret | R2 token |
| `S3_FORCE_PATH_STYLE` | `true` | Type `true` for R2. |
| `ADMIN_USERNAME` | `admin` | The organizer login name. |
| `ADMIN_PASSWORD` | a temporary password | They change it at first login. |
| `HOST` | `0.0.0.0` | Type this. |
| `FILE_SIZE_LIMIT_MB` | `25` | Largest one file. |
| `TEAM_QUOTA_MB` | `500` | Storage cap for one squad. |
| `EVENT_NAME` | `CodeBharat 2026` | Optional. |
| `EVENT_VENUE` | `IIIT Dharwad` | Optional. |
| `EVENT_DATES` | `3–4 December 2026` | Optional. |
| `EVENT_THEME` | `From Code to Concrete Innovation` | Optional. |
| `DEMO_HINTS` | `false` | Keep `false` so sample passwords are not on the sign-in page. |

Save. Railway redeploys. The first boot runs database migrations. It does **not** erase data on later restarts.

## 5. Create the organizer account

1. Install the [Railway CLI](https://docs.railway.com/guides/cli) or use the service shell in the dashboard.
2. Run:

```bash
railway run npm run seed:production
```

3. You should see a line that the organizer login was created.
4. Do not run `npm run seed:demo` on this database. That command adds 150 fake squads and is only for a practice copy.

## 6. Custom domain

Example: `live.codebharat.sasa.engineer`

1. In the Railway app service, open **Settings** → **Networking** → **Custom domain**.
2. Type `live.codebharat.sasa.engineer`.
3. Railway shows a target such as `something.up.railway.app`.
4. At the DNS provider for `sasa.engineer`, add a **CNAME** record:
   - Name: `live`
   - Target: the Railway hostname
5. Wait until Railway says the certificate is ready. This can take 10–30 minutes.
6. Add `https://live.codebharat.sasa.engineer` to the R2 CORS list from step 2.

Another example: `leaderboard.example.com` is the same idea. The CNAME name is `leaderboard`. The target is still Railway's hostname.

## 7. Check that it works

1. Open `https://live.codebharat.sasa.engineer`. You should see an empty leaderboard, not an error.
2. Open `/login`. Sign in as the organizer. It should ask for a new password.
3. After that, the control room opens. **Demo simulation** must say it is off.
4. Add one test squad. Sign in as that squad. Upload a small PDF on an open gate.
5. Open `/api/health`. You want `"database":"ok"` and `"storage":"ok"`.

## 8. Render + Supabase (short alternative)

Use this only if you are not using Railway.

1. Create a Supabase project. Copy the **URI** from **Project Settings → Database**. Add `?sslmode=require` if it is missing.
2. In Supabase **Storage**, you can instead keep using Cloudflare R2. The app speaks S3, not the Supabase client.
3. Create a [Render](https://render.com) web service from the GitHub repo. Render reads `render.yaml`.
4. Set the same variables as the table above. Put the Supabase URI in `DATABASE_URL`.
5. After the first deploy, open Render's shell and run `npm run seed:production`.
6. Add the custom domain in Render and a CNAME at your DNS provider, the same way as step 6.

Then follow [DATABASE_GUIDE.md](DATABASE_GUIDE.md) and [EVENT_DAY_RUNBOOK.md](EVENT_DAY_RUNBOOK.md).
