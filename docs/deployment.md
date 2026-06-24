# Deployment Guide

BillCraft AI is designed to deploy on **Vercel** (Next.js) with **Supabase** as the backend. This guide covers a fresh production deployment.

---

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account with a verified domain
- A [Stripe](https://stripe.com) account (for billing and payments)
- An [OpenAI](https://platform.openai.com) API key (for AI features)

---

## 1. Supabase setup

### Create a project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users
3. Save the database password — you'll need it for the CLI

### Apply migrations

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Log in and link to your project
supabase login
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push
```

### Enable Google OAuth (optional)

In Supabase → **Authentication → Providers → Google**:
- Add your Google OAuth Client ID and Secret
- Set the redirect URL to `https://<your-domain>/auth/callback`

### Enable email auth

In Supabase → **Authentication → Providers → Email**:
- Enable "Confirm email" for production

### Storage bucket

The `create_logos_bucket.sql` migration creates the `logos` storage bucket. Verify it exists under **Storage** in your Supabase dashboard.

---

## 2. Stripe setup

### Create products and prices

Create the following products in your Stripe dashboard (or via the Stripe CLI), then note the Price IDs:

| Product | Billing | Price ID env var |
|---|---|---|
| Basic | Monthly | `STRIPE_BASIC_MONTHLY_PRICE_ID` |
| Basic | Annual | `STRIPE_BASIC_ANNUAL_PRICE_ID` |
| Pro | Monthly | `STRIPE_PRO_MONTHLY_PRICE_ID` |
| Pro | Annual | `STRIPE_PRO_ANNUAL_PRICE_ID` |
| Agency | Monthly | `STRIPE_AGENCY_MONTHLY_PRICE_ID` |
| Agency | Annual | `STRIPE_AGENCY_ANNUAL_PRICE_ID` |

### Create a webhook endpoint

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://<your-domain>/api/webhooks/stripe`
3. Enable these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## 3. Resend setup

1. [resend.com](https://resend.com) → Add a domain → follow DNS verification steps
2. Create an API key → set as `RESEND_API_KEY`
3. Set `RESEND_FROM_EMAIL` to a verified address on that domain (e.g. `invoices@yourdomain.com`)

---

## 4. Deploy to Vercel

### Import the project

1. Push your code to GitHub / GitLab / Bitbucket
2. Vercel dashboard → **New Project → Import**
3. Select the repository
4. Framework preset: **Next.js** (auto-detected)

### Set environment variables

In **Vercel → Project → Settings → Environment Variables**, add all variables from `.env.example`. See [environment-variables.md](environment-variables.md) for descriptions.

Key ones to get right:
- `NEXT_PUBLIC_APP_URL` — your production domain, e.g. `https://app.billcraft.ai`
- `PORTAL_SESSION_SECRET` — generate with `openssl rand -hex 32`
- `CRON_SECRET` — any random string; add it to `vercel.json` cron headers too

### Deploy

Click **Deploy**. Vercel will run `npm run build` and deploy automatically.

---

## 5. Vercel Cron jobs

The following cron jobs run automatically via Vercel Cron (configured in `vercel.json`):

| Schedule | Route | Purpose |
|---|---|---|
| Daily (02:00 UTC) | `/api/cron/overdue` | Mark invoices as overdue, trigger auto-reminders |
| Daily (03:00 UTC) | `/api/cron/recurring` | Generate invoices from recurring schedules |

All cron requests are authenticated with `Authorization: Bearer <CRON_SECRET>`.

---

## 6. Post-deployment checklist

- [ ] Sign up for a new account and verify the onboarding flow works
- [ ] Create a test invoice and confirm PDF download works
- [ ] Send a test invoice email and verify it arrives
- [ ] Complete a Stripe test checkout (`4242 4242 4242 4242`) and verify subscription activates
- [ ] Check the client portal: create a test client with a portal token, log in via OTP
- [ ] Confirm AI invoice generation works (type a natural language description)
- [ ] Verify the Stripe webhook is receiving events in the Stripe dashboard

---

## Custom domain

1. Vercel → **Domains → Add**
2. Follow DNS instructions (add A/CNAME records at your registrar)
3. Update `NEXT_PUBLIC_APP_URL` to match the new domain
4. Update the Stripe webhook endpoint URL
5. Update the Supabase Auth redirect URL if using OAuth

---

## Updating the app

Push a new commit to the main branch — Vercel redeploys automatically. If migrations changed, run `supabase db push` before or immediately after deploying.
