# BillCraft AI — Docker Build & Deployment

## Prerequisites

- Docker 24+ (or Docker Desktop)
- A `.env.production` file with all runtime secrets (see [Environment Variables](#environment-variables))
- Supabase project with migrations applied

---

## How the image is built

The `Dockerfile` uses a **3-stage build**:

| Stage | Base image | Purpose |
|---|---|---|
| `deps` | `node:24-alpine` | Install npm dependencies (cached layer) |
| `builder` | `node:24-alpine` | Run `next build`, produce `.next/standalone` |
| `runner` | `node:24-alpine` | Minimal runtime image (~200 MB) |

The final image runs as a **non-root user** (`nextjs:nodejs`, UID 1001) and listens on port `3000`.

---

## Build

`NEXT_PUBLIC_*` variables are **baked into the JS bundle at build time** and cannot be changed at runtime. Pass them as `--build-arg`.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.billcraft.ai \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  --build-arg NEXT_PUBLIC_PAYPAL_CLIENT_ID=AaBb... \
  -t billcraft-ai:latest \
  .
```

Tag with a version for easier rollbacks:

```bash
docker build ... -t billcraft-ai:$(git rev-parse --short HEAD)
```

---

## Run

Runtime secrets (API keys, webhook secrets, etc.) are **never baked into the image** — pass them via `--env-file`:

```bash
docker run -d \
  --name billcraft-ai \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  billcraft-ai:latest
```

Verify it started:

```bash
docker logs -f billcraft-ai
# Should see: ✓ Ready in Xms  (port 3000)
```

---

## Environment variables

Create `.env.production` from the template below. **Never commit this file.**

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── OpenAI (AI features) ──────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Email provider — pick one ─────────────────────────────────────────────────
# Option A: Gmail (OAuth 2.0)
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REFRESH_TOKEN=1//04...
EMAIL_FROM=invoices@aakasa.dev

# Option B: Resend
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=re_...
# RESEND_FROM_EMAIL=invoices@aakasa.dev

# ── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_MONTHLY_PRICE_ID=price_...
STRIPE_BASIC_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_AGENCY_MONTHLY_PRICE_ID=price_...
STRIPE_AGENCY_ANNUAL_PRICE_ID=price_...

# ── PayPal (optional — leave blank to disable) ────────────────────────────────
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_API_URL=https://api-m.paypal.com
PAYPAL_WEBHOOK_ID=
PAYPAL_BASIC_MONTHLY_PLAN_ID=
PAYPAL_BASIC_ANNUAL_PLAN_ID=
PAYPAL_PRO_MONTHLY_PLAN_ID=
PAYPAL_PRO_ANNUAL_PLAN_ID=
PAYPAL_AGENCY_MONTHLY_PLAN_ID=
PAYPAL_AGENCY_ANNUAL_PLAN_ID=

# ── Client portal ─────────────────────────────────────────────────────────────
PORTAL_SESSION_SECRET=<32-byte hex — generate with: openssl rand -hex 32>

# ── Cron jobs ─────────────────────────────────────────────────────────────────
CRON_SECRET=<random secret — used by the scheduler to authenticate cron calls>

# ── Admin panel ───────────────────────────────────────────────────────────────
ADMIN_EMAILS=your@email.com,another@email.com

# ── Next.js server ────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=app.billcraft.ai
```

> **Note:** `NEXT_PUBLIC_*` variables go in `--build-arg` at build time, **not** in `.env.production`.

---

## Running behind nginx

The container serves on port `3000`. A typical nginx reverse proxy block:

```nginx
server {
    listen 443 ssl;
    server_name app.billcraft.ai;

    # SSL config here ...

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Database migrations

Before starting the container for the first time (or after adding a migration), apply all SQL files to your Supabase project via the **SQL editor** or Supabase CLI:

```bash
# Using Supabase CLI
supabase db push

# Or manually — run each file in order:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_client_cc_emails.sql
# supabase/migrations/003_admin_features.sql
```

---

## Updating

```bash
# Pull latest code
git pull

# Rebuild
docker build ... -t billcraft-ai:latest .

# Replace running container
docker stop billcraft-ai
docker rm billcraft-ai
docker run -d --name billcraft-ai -p 3000:3000 --env-file .env.production --restart unless-stopped billcraft-ai:latest
```

---

## Useful commands

```bash
# View live logs
docker logs -f billcraft-ai

# Open a shell inside the container
docker exec -it billcraft-ai sh

# Check image size
docker images billcraft-ai

# Remove old images
docker image prune -f
```
