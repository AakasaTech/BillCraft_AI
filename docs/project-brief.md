# BillCraft AI — Project Brief

**Tagline:** Create professional invoices in under 60 seconds using natural language.

**What it is:** A SaaS invoicing platform for freelancers, consultants, and small agencies. Core hook is AI-powered invoice generation — describe the work in plain English, get a structured, branded invoice draft.

## Tech stack

- **Framework:** Next.js 15 (App Router, TypeScript), React 19, Turbopack dev
- **Styling:** Tailwind v4 (OKLCH colors, `@theme inline`), shadcn/ui (radix-nova style)
- **Backend/Auth/DB:** Supabase (Postgres + Auth + Row Level Security + Storage)
- **AI:** OpenAI gpt-4o, called via raw `node:https` (not the SDK — avoids an undici "premature close" bug)
- **Payments:** Stripe (subscriptions + payment links) and PayPal (alternative subscription billing)
- **Email:** Resend
- **PDF:** `@react-pdf/renderer` (server-side, no headless browser)
- **Scheduling:** Vercel Cron hitting plain API routes (no external job queue)
- **Deployment:** Docker support (`output: 'standalone'`), Vercel-oriented

## Implemented features

**Invoices** — manual or AI-generated (NL prompt → structured invoice via GPT-4o with per-field confidence scoring), full editor, auto invoice numbers (`INV-YYYY-NNNN`, custom prefix), multi-currency, tax modes (VAT/GST/Sales Tax/None), discounts, full status lifecycle (draft→sent→viewed→partial→paid→overdue/void/cancelled), branded PDF export, public share links, email delivery, AI-drafted payment reminders (Pro), automated reminder scheduling, auto late fees, manual payment recording (bank/card/cash/cheque/PayPal/crypto), Stripe payment links, partial payments, bulk actions, reusable invoice templates, per-invoice email history.

**Estimates/Quotes** — same editor as invoices, public accept/decline page, auto-convert accepted estimates to draft invoices, amber-themed PDF.

**Clients** — full CRUD, password-less client portal (email OTP login), portal statement PDF download, filterable invoice list per client.

**Payments** — Stripe + PayPal subscription checkout (Basic/Pro/Agency × monthly/annual), webhook-driven lifecycle handling, plan-gated features (AI, expenses, recurring, templates), 14-day trial.

**Dashboard** — revenue/outstanding/overdue/open-estimates KPIs, collection rate & avg-days-to-pay analytics, 12-month revenue chart with expense overlay, invoice status donut, top clients, overdue list, recent invoices.

**Expenses** — logging with receipt upload, category filtering, overlay on the revenue chart.

**Recurring invoices** — daily/weekly/monthly/quarterly/annual schedules via Vercel cron, draft-or-auto-send choice, end date/occurrence limits.

**Products catalog** — reusable line items with pricing, used as a picker inside invoice/estimate editors.

**Email templates** — per-type (invoice/reminder/estimate), variable placeholders, Pro/Agency-gated editing.

**Team** — invite by email, roles (owner/admin/member/viewer), revoke access.

**Settings** — org profile/branding, user profile, notification toggles, email templates, filterable audit log.

**API surface** — AI extraction/reminder-drafting endpoints, invoice/estimate PDF streaming, public estimate accept/decline, client-portal OTP auth, Stripe + PayPal webhooks, cron endpoints for overdue detection and recurring generation.

## Architecture notes worth flagging

- Multi-tenant via Supabase Row Level Security, not app-level checks
- `amount_due` is a Postgres generated column — never written directly
- Client portal sessions authenticated via HMAC-SHA256, not Supabase auth
- Plan gating centralized through a `getPlanStatus()` helper (`canUseAI`, `canUseTemplates`, etc.)
- Light theme only currently
- No async job queue — PDF/email/AI calls run inline in the request; cron jobs are plain scheduled HTTP hits
