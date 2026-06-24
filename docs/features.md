# Feature Reference

Complete list of implemented features, grouped by area.

---

## Invoices

| Feature | Notes |
|---|---|
| Create invoice | Manual form with client, line items, discount, tax, notes, payment instructions |
| AI invoice generation | Natural language → structured invoice via GPT-4o; confidence scoring per field |
| Edit invoice | Full edit for draft invoices |
| Invoice number | Auto-incremented per org (`INV-YYYY-NNNN`); customisable prefix |
| Multi-currency | Per-invoice currency; live exchange rate display |
| Tax modes | VAT, GST, Sales Tax, None; per-invoice rate |
| Discount | Flat discount applied before tax |
| Status lifecycle | `draft → sent → viewed → partial → paid → overdue / void / cancelled` |
| PDF download | Branded PDF with line items, totals, org logo |
| Public share link | `/p/<share_token>` — client-viewable invoice page |
| Send by email | Invoice PDF emailed via Resend; marks status as `sent` |
| Payment reminder | AI-drafted personalised message (Pro); editable before sending |
| Automated reminders | Schedule days-before / days-after due date; configurable per org |
| Late fees | Auto-apply flat or % late fee after configurable grace period |
| Record payment | Manual payment entry (bank transfer, card, cash, cheque, PayPal, crypto) |
| Stripe payment link | Embedded on public share page; client pays by card |
| Partial payments | Multiple payments tracked; `partial` status; running `amount_due` |
| Mark paid / void | Manual status override |
| Bulk actions | Bulk status update, bulk delete from invoices list |
| Invoice templates | Save reusable line-item sets for recurring work |
| Email history | Per-invoice timeline of every email sent (subject, date, status) |

---

## Estimates / Quotes

| Feature | Notes |
|---|---|
| Create estimate | Same editor as invoices; estimate number `EST-YYYY-NNNN` |
| Send estimate | Emailed with PDF attachment and accept/decline link |
| Public estimate page | `/e/<share_token>` — client can accept or decline with optional note |
| Status lifecycle | `draft → sent → viewed → accepted / declined / expired` |
| Convert to invoice | Accepted estimate → new draft invoice (copies all line items) |
| Manual status override | Mark accepted, declined, or expired from detail view |
| PDF download | Amber-themed estimate PDF |

---

## Clients

| Feature | Notes |
|---|---|
| Client CRUD | Name, email, phone, address, country, tax number, currency preference |
| Client portal | Password-less login via email OTP; client sees their own invoices |
| Portal statement download | Client downloads a dated account statement PDF |
| Client invoice list | Filterable by status |

---

## Payments

| Feature | Notes |
|---|---|
| Stripe checkout | Subscription management (Basic / Pro / Agency × monthly / annual) |
| PayPal billing | Alternative subscription via PayPal Plans API |
| Stripe webhook | Handles subscription lifecycle events |
| PayPal webhook | Handles subscription lifecycle events |
| Plan enforcement | Feature gates based on active plan: AI, expenses, recurring, templates |
| Trial period | 14-day trial with full Pro features; configurable per org |

---

## Dashboard

| Feature | Notes |
|---|---|
| Revenue KPI | This-month revenue with trend % vs last month |
| Outstanding KPI | Sum and count of unpaid invoices |
| Overdue KPI | Sum and count, red-tinted when non-zero |
| Open estimates KPI | Pending estimate count |
| Analytics strip | Collection rate, avg invoice value, avg days to pay, YTD revenue |
| Revenue chart | 12-month bar chart with optional expenses overlay |
| Invoice breakdown | Donut chart by status |
| Top clients | Ranked by revenue with bar indicators |
| Estimates widget | Pending/accepted/accept-rate tiles + recent estimates list |
| Overdue list | Top overdue invoices with days-overdue count |
| Recent invoices | Last 5 invoices with status and amount |

---

## Expenses

| Feature | Notes |
|---|---|
| Log expense | Date, amount, currency, category, notes, receipt upload |
| Category filter | Filter by category on expenses list |
| Revenue overlay | Expenses grouped by month appear as a second bar on the revenue chart |

---

## Recurring invoices

| Feature | Notes |
|---|---|
| Schedule | Daily, weekly, monthly, quarterly, annual |
| Auto-generate | Vercel cron creates invoices on schedule |
| Draft or auto-send | Choose whether generated invoices are created as draft or sent immediately |
| End date / count | Optional end date or max occurrences |

---

## Products catalog

| Feature | Notes |
|---|---|
| Save products | Name, description, default unit price, currency |
| Use in invoices | Popover picker in invoice and estimate editors |
| CRUD | Create, edit, toggle active, delete |

---

## Email templates

| Feature | Notes |
|---|---|
| Per-type templates | Separate templates for invoice, reminder, and estimate emails |
| Subject customisation | Full control with `{{variable}}` placeholders |
| Body customisation | Opening paragraph (2–3 sentences); HTML structure preserved |
| Variable chips | Clickable insert buttons for available variables |
| Reset to default | Delete saved template; restores built-in default text |
| Plan gate | Create/edit requires Pro or Agency plan |

### Available variables

**Invoice & Reminder:** `{{client_name}}`, `{{org_name}}`, `{{invoice_number}}`, `{{amount_due}}`, `{{total}}`, `{{issue_date}}`, `{{due_date}}`, `{{invoice_url}}`

**Estimate:** `{{client_name}}`, `{{org_name}}`, `{{estimate_number}}`, `{{total}}`, `{{issue_date}}`, `{{expiry_date}}`, `{{estimate_url}}`

---

## Team

| Feature | Notes |
|---|---|
| Invite members | Email invitation with role selection |
| Roles | `owner`, `admin`, `member`, `viewer` |
| Revoke access | Remove a member from the organisation |

---

## Settings

| Area | Features |
|---|---|
| Organisation | Name, logo, address, tax number, default currency, invoice prefix |
| Profile | Name, email, avatar |
| Notifications | Toggle email notifications per event type |
| Email templates | Custom subject and body per email type (see above) |
| Audit log | Filterable history of all create/update/delete actions |

---

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/ai/extract-invoice` | Supabase user | AI invoice extraction from natural language |
| `POST /api/ai/draft-reminder` | Supabase user | AI payment reminder drafting |
| `GET /api/invoices/[id]/pdf` | Supabase user | Stream invoice PDF |
| `GET /api/e/[token]/pdf` | Public | Stream estimate PDF |
| `POST /api/e/[token]/respond` | Public | Accept or decline an estimate |
| `GET /api/portal/[token]/statement/pdf` | Portal cookie | Stream client statement PDF |
| `POST /api/portal/[token]/auth/request-otp` | Public | Send portal login OTP |
| `POST /api/portal/[token]/auth/verify-otp` | Public | Verify OTP and set session cookie |
| `POST /api/webhooks/stripe` | Stripe signature | Handle Stripe subscription events |
| `POST /api/webhooks/paypal` | PayPal signature | Handle PayPal subscription events |
| `GET /api/cron/overdue` | Cron secret | Mark overdue invoices; trigger auto-reminders |
| `GET /api/cron/recurring` | Cron secret | Generate recurring invoices |
