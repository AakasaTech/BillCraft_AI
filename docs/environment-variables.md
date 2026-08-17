# Environment Variables

All variables are set in `.env.local` for local development. In production, set them in the Vercel dashboard under **Settings → Environment Variables**.

Copy `.env.example` from the project root as a starting point.

---

## Supabase

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL, e.g. `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase `anon` (public) key — safe to expose in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key — **never expose client-side**. Used only in server-side routes that bypass RLS (e.g. client portal PDF, webhook handlers) |

Found in your Supabase project under **Settings → API**.

---

## Application

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | The full origin of your app, e.g. `https://app.billcraft.ai`. Used to build absolute URLs in emails and public share links. No trailing slash. |

---

## OpenAI

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Pro/Agency | Secret key from [platform.openai.com](https://platform.openai.com). Required for AI invoice generation and AI reminder drafting. Omit to disable AI features entirely. |

The app uses `gpt-4o` for all AI features. Without this key, AI-powered routes return a 500 and the UI shows a "not configured" message.

---

## Resend (email)

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | For email | API key from [resend.com](https://resend.com). Required to send invoices, reminders, and estimates by email. |
| `RESEND_FROM_EMAIL` | For email | The verified sender address, e.g. `invoices@yourdomain.com`. Must be a domain verified in Resend. |

Without these, the "Send to client" and "Send reminder" buttons return an error message. Everything else works normally.

---

## Stripe

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | For payments | Secret key from the Stripe dashboard. Use `sk_test_...` in development and `sk_live_...` in production. |
| `STRIPE_WEBHOOK_SECRET` | For payments | Webhook signing secret (`whsec_...`). Generated when you create a webhook endpoint in Stripe. Required to verify incoming webhook events. |
| `STRIPE_BASIC_MONTHLY_PRICE_ID` | For billing | Stripe Price ID for the Basic plan (monthly). |
| `STRIPE_BASIC_ANNUAL_PRICE_ID` | For billing | Stripe Price ID for the Basic plan (annual). |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | For billing | Stripe Price ID for the Pro plan (monthly). |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | For billing | Stripe Price ID for the Pro plan (annual). |
| `STRIPE_AGENCY_MONTHLY_PRICE_ID` | For billing | Stripe Price ID for the Agency plan (monthly). |
| `STRIPE_AGENCY_ANNUAL_PRICE_ID` | For billing | Stripe Price ID for the Agency plan (annual). |

**Stripe webhook events to enable:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Local webhook testing:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## PayPal

PayPal billing is optional. Leave all `PAYPAL_*` variables blank to disable it entirely — only Stripe billing will be available.

| Variable | Required | Description |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Optional | PayPal REST API client ID |
| `PAYPAL_CLIENT_SECRET` | Optional | PayPal REST API client secret |
| `PAYPAL_API_URL` | Optional | `https://api-m.sandbox.paypal.com` (sandbox) or `https://api-m.paypal.com` (live) |
| `PAYPAL_WEBHOOK_ID` | Optional | Webhook ID from the PayPal developer dashboard |
| `PAYPAL_BASIC_MONTHLY_PLAN_ID` | Optional | PayPal Billing Plan ID for Basic monthly |
| `PAYPAL_BASIC_ANNUAL_PLAN_ID` | Optional | PayPal Billing Plan ID for Basic annual |
| `PAYPAL_PRO_MONTHLY_PLAN_ID` | Optional | PayPal Billing Plan ID for Pro monthly |
| `PAYPAL_PRO_ANNUAL_PLAN_ID` | Optional | PayPal Billing Plan ID for Pro annual |
| `PAYPAL_AGENCY_MONTHLY_PLAN_ID` | Optional | PayPal Billing Plan ID for Agency monthly |
| `PAYPAL_AGENCY_ANNUAL_PLAN_ID` | Optional | PayPal Billing Plan ID for Agency annual |

---

## Client portal

| Variable | Required | Description |
|---|---|---|
| `PORTAL_SESSION_SECRET` | Yes (if portal enabled) | A random 32-byte hex string used to sign HMAC-SHA256 portal session cookies. Generate with `openssl rand -hex 32`. Changing this value invalidates all active portal sessions. |

---

## Custom email sending (org-connected mailboxes)

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | For custom email sending | A 32-byte key, base64-encoded, used to encrypt OAuth client secrets and refresh tokens for orgs that connect their own Google Workspace/Microsoft 365 mailbox (`org_email_connections` table). Generate with `openssl rand -base64 32`. **Rotating this key invalidates every org's stored connection** — they'd need to reconnect. |

Without this key, the "Settings → Email sending" page still loads, but saving a Google/Microsoft connection fails at the encryption step. This is independent of the platform-wide `RESEND_API_KEY`/`GMAIL_*` sender — orgs that don't connect their own mailbox are unaffected either way. See [Custom Email Sending](/docs/custom-email-sending) for the end-user setup flow.

---

## Vercel Cron

| Variable | Required | Description |
|---|---|---|
| `CRON_SECRET` | For cron jobs | A secret token sent as `Authorization: Bearer <CRON_SECRET>` by Vercel Cron to authenticate scheduled job requests. Set in the Vercel dashboard and in `vercel.json`. |

---

## Variable availability

| Prefix | Available in | Notes |
|---|---|---|
| `NEXT_PUBLIC_` | Browser + server | Bundled into the client JS — never put secrets here |
| _(no prefix)_ | Server only | Never exposed to the browser |
