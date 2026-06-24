# Database Migrations

All migrations live in `supabase/migrations/`. They must be applied in the order listed below.

## Applying migrations

### Option A — Supabase CLI (recommended)

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies all pending migrations automatically.

### Option B — SQL editor

Open your Supabase project → **SQL Editor** → paste and run each file in order.

---

## Migration files

| Order | File | Description |
|---|---|---|
| 1 | `001_initial_schema.sql` | Core tables: organizations, users, clients, invoices, invoice_items, payments, subscriptions, email_logs, ai_requests, audit_logs |
| 2 | `002_auth_trigger.sql` | Trigger to auto-create a `users` row when a new Supabase Auth user signs up |
| 3 | `add_trial_to_organizations.sql` | Adds `trial_ends_at` column to organizations |
| 4 | `add_invoice_share_token.sql` | Adds `share_token` UUID column to invoices for public share links |
| 5 | `add_org_payment_instructions.sql` | Adds `default_payment_instructions` to organizations |
| 6 | `add_invitations.sql` | Team invitation system (`invitations` table) |
| 7 | `add_last_reminder_sent_at.sql` | Adds `last_reminder_sent_at` to invoices |
| 8 | `add_recurring_invoices.sql` | `recurring_invoices` table for scheduled invoice generation |
| 9 | `add_expenses.sql` | `expenses` table with categories |
| 10 | `add_late_fee_settings.sql` | Per-org late fee configuration |
| 11 | `add_reminder_settings.sql` | Per-org automated reminder schedule |
| 12 | `add_invoice_templates.sql` | `invoice_templates` and `invoice_template_items` tables |
| 13 | `add_peek_invoice_number.sql` | `peek_invoice_number()` SQL function (non-destructive preview) |
| 14 | `add_products.sql` | `products` catalog table |
| 15 | `add_client_portal_token.sql` | Adds `portal_token` to clients for portal URL |
| 16 | `add_portal_otp.sql` | OTP-based portal authentication |
| 17 | `add_estimates.sql` | `estimates` and `estimate_items` tables; `next_estimate_number()` and `peek_estimate_number()` functions |
| 18 | `add_email_templates.sql` | Per-org custom email templates (invoice / reminder / estimate) |
| 19 | `create_logos_bucket.sql` | Supabase Storage bucket for organisation logos |

---

## Key SQL functions

These functions are defined inside their respective migration files and are used by the application at runtime.

| Function | Migration | Purpose |
|---|---|---|
| `get_user_org_id()` | `001_initial_schema.sql` | Returns the `organization_id` of the currently authenticated user. Used in every RLS policy. |
| `next_invoice_number(p_org_id)` | `001_initial_schema.sql` | Atomically increments and returns the next invoice number string (e.g. `INV-2026-0042`). |
| `peek_invoice_number(p_org_id)` | `add_peek_invoice_number.sql` | Returns the next invoice number without consuming it. Used to preview the number on the new invoice form. |
| `next_estimate_number(p_org_id)` | `add_estimates.sql` | Atomically increments and returns the next estimate number string (e.g. `EST-2026-0007`). |
| `peek_estimate_number(p_org_id)` | `add_estimates.sql` | Returns the next estimate number without consuming it. |

---

## Row Level Security

Every table has RLS enabled. All policies rely on `get_user_org_id()` to scope reads and writes to the authenticated user's organization. The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and is used only in:

- `/api/portal/[token]/*` routes (clients authenticate via HMAC cookie, not Supabase Auth)
- `/api/webhooks/*` routes (Stripe/PayPal webhooks are not authenticated users)
