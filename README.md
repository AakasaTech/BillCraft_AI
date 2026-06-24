# BillCraft AI

> Create professional invoices in under 60 seconds using natural language.

BillCraft AI is a web-based SaaS invoicing platform for freelancers, consultants, and small agencies. Describe work in plain English, and BillCraft handles the rest — line items, taxes, PDF generation, email delivery, and payment collection.

---

## Features

### Core invoicing
- **AI invoice generation** — describe a job in plain language; GPT-4o extracts client, line items, dates, and amounts
- **Invoice editor** — full manual editing with line items, discount, tax (VAT / GST / sales tax), and payment instructions
- **PDF download** — professionally formatted PDF for every invoice and estimate
- **Invoice sharing** — public `/p/<token>` page for clients to view and pay
- **Status lifecycle** — draft → sent → viewed → partial → paid / overdue / void

### Estimates & quotes
- Create and send estimates with accept / decline flow via a public `/e/<token>` page
- Convert accepted estimates to invoices in one click

### Payments
- **Stripe** — payment links attached to shared invoice pages
- **PayPal** — subscription billing via PayPal Plans API
- **Manual payments** — record bank transfer, cash, cheque, etc.

### Client portal
- Password-less login via email OTP
- View all invoices, make payments, download statement PDF for any date range

### Automation & reminders
- **AI reminder drafting** — GPT-4o writes a personalised reminder message based on invoice context and payment history; editable before sending
- **Scheduled reminders** — automatic overdue reminders with configurable lead/lag days
- **Late fees** — optional automatic late fee application

### Email
- Transactional email via Resend with PDF attachments
- **Custom email templates** — per-type (invoice / reminder / estimate) subject and body with `{{variable}}` placeholders

### Analytics dashboard
- Revenue vs expenses chart (12 months)
- KPIs: this-month revenue with trend %, outstanding, overdue, open estimates
- Analytics strip: collection rate, avg invoice value, avg days to pay, YTD revenue
- Top clients by revenue, estimates widget

### Other
- **Invoice templates** — reusable line-item templates for recurring work
- **Product catalog** — saved products / services with default price
- **Expenses tracking** — log and categorise expenses; overlay on revenue chart
- **Recurring invoices** — schedule automatic invoice generation
- **Team** — invite members with role-based access (owner / admin / member / viewer)
- **Audit log** — full change history
- **Multi-currency** — live exchange rates, per-invoice currency override
- **Organisation branding** — logo upload, custom invoice prefix, tax number

### Subscription tiers

| Tier | Price | Invoices | AI | Expenses | Recurring |
|---|---|---|---|---|---|
| Trial | Free (14 days) | 5 / month | ✓ | ✓ | ✓ |
| Basic | — | 20 / month | ✗ | ✗ | ✗ |
| Pro | — | Unlimited | ✓ | ✓ | ✓ |
| Agency | — | Unlimited | ✓ | ✓ | ✓ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (TypeScript) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL 15 + RLS) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | OpenAI GPT-4o |
| Email | Resend |
| Payments | Stripe + PayPal |
| PDF | @react-pdf/renderer |
| Charts | Recharts |
| Deployment | Vercel |

---

## Local Development

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier is fine)
- API keys for OpenAI, Resend, and Stripe (optional for payment features)

### 1. Clone and install

```bash
git clone <repo-url>
cd BillCraft_AI
npm install
```

### 2. Environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

See [docs/environment-variables.md](docs/environment-variables.md) for a full description of every variable.

### 3. Set up Supabase

Apply all migrations in order:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or run them manually in the Supabase SQL editor — see [docs/database-migrations.md](docs/database-migrations.md).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  (app)/          # Authenticated app pages
    dashboard/
    invoices/
    estimates/
    clients/
    products/
    expenses/
    templates/
    settings/
  (auth)/         # Login / register / onboard
  (public)/       # Landing page
  api/            # API routes (AI, webhooks, PDFs, portal)
  portal/         # Client portal pages
  p/[token]/      # Public invoice share page
  e/[token]/      # Public estimate share page

components/
  ui/             # shadcn/ui primitives
  invoices/
  estimates/
  clients/
  dashboard/
  portal/
  settings/

lib/
  supabase/       # Server / client Supabase helpers
  email/          # Email template builders + variable renderer
  pdf/            # React-PDF invoice, estimate, statement components
  validations/    # Zod schemas (separate from 'use server' files)

types/
  database.ts     # All entity interfaces + Supabase Database type

supabase/
  migrations/     # SQL migration files
```

---

## Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check (no emit)
```

---

## Deployment

See [docs/deployment.md](docs/deployment.md) for a step-by-step Vercel + Supabase production deployment guide.

---

## Documentation

| Document | Description |
|---|---|
| [docs/prd.md](docs/prd.md) | Product requirements document |
| [docs/system_arch.md](docs/system_arch.md) | System architecture and data flow |
| [docs/db_schema.md](docs/db_schema.md) | PostgreSQL schema and ER diagram |
| [docs/ai_invoice.md](docs/ai_invoice.md) | AI invoice extraction — prompt design and confidence scoring |
| [docs/features.md](docs/features.md) | Implemented feature reference |
| [docs/environment-variables.md](docs/environment-variables.md) | All environment variables explained |
| [docs/database-migrations.md](docs/database-migrations.md) | Migration files and run order |
| [docs/deployment.md](docs/deployment.md) | Production deployment guide |
