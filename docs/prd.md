# BillCraft AI — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-06-22  
**Status:** Draft  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Personas](#2-user-personas)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [MVP Scope](#6-mvp-scope)
7. [Future Roadmap](#7-future-roadmap)
8. [Success Metrics](#8-success-metrics)
9. [Database Entities](#9-database-entities)
10. [API Requirements](#10-api-requirements)

---

## 1. Product Overview

### 1.1 Product Name
**BillCraft AI**

### 1.2 Tagline
*Create professional invoices in under 60 seconds using natural language.*

### 1.3 Problem Statement
Freelancers, consultants, solo agencies, and remote contractors spend disproportionate time on administrative billing tasks. Traditional invoicing tools require navigating complex forms, manually entering line items, calculating taxes, and chasing payments. This friction delays cash flow, causes errors, and detracts from billable work.

### 1.4 Solution
BillCraft AI is a web-based SaaS invoicing platform that uses a conversational AI interface to generate professional invoices from plain-language input. Users describe what they did and who they did it for; BillCraft AI handles the rest — extracting entities, formatting line items, applying the correct tax rules for the target jurisdiction, and delivering a polished PDF invoice with a Stripe payment link, all in under 60 seconds.

### 1.5 Core Value Proposition
> "Create professional invoices in under 60 seconds using natural language."

**Example input:**
> "Create an invoice for Acme Inc. for website redesign services, 20 hours at $75 per hour, due in 14 days."

**Output:** A branded, PDF-ready invoice with correct tax calculation, a Stripe payment link, and automatic email delivery to the client.

### 1.6 Target Market
Global freelancers and solo businesses across four primary regions:

| Region | Key Markets |
|---|---|
| North America | United States, Canada |
| Europe | United Kingdom, Germany, France, Netherlands, Poland |
| Asia-Pacific | Australia, India, Singapore, Japan |
| Middle East | UAE, Saudi Arabia |

### 1.7 Subscription Tiers

| Tier | Price | Invoice Limit | Key Features |
|---|---|---|---|
| **Free** | $0/month | 3 invoices/month | AI generation, PDF, email delivery |
| **Pro** | $10/month | Unlimited | All Free + multi-currency, overdue reminders, custom branding, analytics |
| **Agency** | $19/month | Unlimited | All Pro + multiple company profiles, team seats (up to 3), priority support |

### 1.8 Platform Scope
- **Web application** (responsive, desktop-first)
- **REST API** for future integrations
- Global compliance: GDPR, international invoicing standards, multi-currency, multi-tax-system

---

## 2. User Personas

### Persona 1 — The Independent Freelancer
**Name:** Sara, 29 — UX Designer  
**Location:** Toronto, Canada  
**Income:** $80,000–$120,000/year from 4–6 recurring clients  

**Goals:**
- Send invoices quickly so she gets paid faster
- Look professional without hiring an accountant
- Track which clients have paid and who is overdue

**Pain Points:**
- Spends 30–60 minutes per invoice in spreadsheets
- Forgets to apply Canadian GST/HST correctly per province
- Chases late payments manually over email

**BillCraft AI Use Case:** Types a description of completed work; BillCraft auto-applies HST, generates a branded invoice, and sends a Stripe payment link.

---

### Persona 2 — The Solo Consultant
**Name:** Ravi, 41 — IT Strategy Consultant  
**Location:** Dubai, UAE  
**Income:** $200,000+/year, 2–4 large corporate clients  

**Goals:**
- Issue compliant VAT invoices (UAE 5% VAT)
- Maintain a paper trail for audit purposes
- Accept international wire payments and card payments

**Pain Points:**
- UAE VAT invoicing has strict mandatory fields
- Clients are in different time zones, making follow-up hard
- Uses three different tools that don't talk to each other

**BillCraft AI Use Case:** Generates VAT-compliant invoices with TRN numbers, multi-currency support (USD and AED), and automated payment reminders.

---

### Persona 3 — The Remote Contractor
**Name:** Maja, 34 — Full-Stack Developer  
**Location:** Warsaw, Poland  
**Income:** €60,000–€90,000/year from clients in Germany and the US  

**Goals:**
- Invoice in EUR and USD from a Polish entity
- Ensure EU reverse-charge VAT is applied correctly for B2B cross-border invoices
- Minimize admin time between client projects

**Pain Points:**
- EU B2B reverse-charge rules are confusing and differ per country pair
- Needs invoices in both English and Polish depending on the client
- Accounting software is overkill for her volume

**BillCraft AI Use Case:** AI detects cross-border EU B2B context, auto-applies reverse-charge language, and outputs bilingual invoice PDFs.

---

### Persona 4 — The Solo Agency Owner
**Name:** Marcus, 37 — Creative Director  
**Location:** Melbourne, Australia  
**Income:** $300,000+ AUD/year, runs a 3-person micro-agency  

**Goals:**
- Manage billing for multiple sub-brands under one account
- Delegate invoicing to a part-time assistant
- Track revenue across clients and projects with one dashboard

**Pain Points:**
- Existing tools don't support multiple company profiles
- No way to grant limited access to an assistant without sharing full account credentials
- Loses track of unpaid invoices across projects

**BillCraft AI Use Case:** Agency tier with multiple company profiles, 3 team seats, and a consolidated revenue dashboard.

---

## 3. User Stories

### Authentication & Onboarding

| ID | Story | Priority |
|---|---|---|
| US-001 | As a new user, I want to sign up with my email or Google account so I can get started without friction. | Must |
| US-002 | As a returning user, I want to log in securely and be remembered on trusted devices. | Must |
| US-003 | As a user, I want to complete an onboarding wizard that captures my company name, logo, currency, and tax details so my first invoice is already branded. | Must |
| US-004 | As a user, I want to reset my password via email if I forget it. | Must |

### Company Profile & Settings

| ID | Story | Priority |
|---|---|---|
| US-010 | As a user, I want to add my business name, address, logo, and default payment terms so they appear on every invoice automatically. | Must |
| US-011 | As an Agency user, I want to create multiple company profiles so I can bill from different entities under one login. | Should |
| US-012 | As a user, I want to set my default currency, tax rate, and invoice numbering format in settings. | Must |
| US-013 | As a user, I want to customise invoice colors and font so my invoices match my brand. | Should |

### Client Management

| ID | Story | Priority |
|---|---|---|
| US-020 | As a user, I want to add, edit, and archive clients with their contact details, billing address, and preferred currency. | Must |
| US-021 | As a user, I want the AI to recognize existing clients by name when I describe work so it prefills their billing details. | Must |
| US-022 | As a user, I want to view all invoices associated with a client and their payment history. | Should |
| US-023 | As a user, I want to import clients from a CSV file so I don't have to re-enter them manually. | Could |

### AI Invoice Generation

| ID | Story | Priority |
|---|---|---|
| US-030 | As a user, I want to describe my work in plain English and have the AI generate a complete invoice draft in under 10 seconds. | Must |
| US-031 | As a user, I want the AI to extract the client name, service description, quantity, rate, and due date from my input. | Must |
| US-032 | As a user, I want the AI to automatically select the correct tax rule based on my location and the client's location. | Must |
| US-033 | As a user, I want the AI to clarify ambiguous inputs by asking a single follow-up question rather than failing silently. | Should |
| US-034 | As a user, I want the AI to remember my common clients and services so I can use shorthand like "bill Acme for 3 hours of support." | Should |

### Invoice Editor

| ID | Story | Priority |
|---|---|---|
| US-040 | As a user, I want to review and edit all fields in the AI-generated invoice before sending it. | Must |
| US-041 | As a user, I want to add, remove, or reorder line items with quantity, unit price, and description. | Must |
| US-042 | As a user, I want to apply a discount (percentage or fixed) to the invoice total. | Should |
| US-043 | As a user, I want to add notes or payment terms text to the bottom of the invoice. | Should |
| US-044 | As a user, I want to see a live preview of the PDF as I edit. | Should |

### PDF Generation & Delivery

| ID | Story | Priority |
|---|---|---|
| US-050 | As a user, I want to download the invoice as a professionally formatted PDF. | Must |
| US-051 | As a user, I want to send the invoice directly to the client's email from the platform with a customisable message. | Must |
| US-052 | As a user, I want the invoice email to include a Stripe payment link so the client can pay online immediately. | Must |
| US-053 | As a user, I want a shareable link to the invoice so I can send it via any channel. | Should |

### Payments & Tracking

| ID | Story | Priority |
|---|---|---|
| US-060 | As a user, I want to connect my Stripe account so clients can pay via card directly from the invoice. | Must |
| US-061 | As a user, I want invoice status to update automatically when a Stripe payment is received. | Must |
| US-062 | As a user, I want to manually mark an invoice as paid if payment was received outside the platform. | Must |
| US-063 | As a user, I want to receive automated email reminders to clients when an invoice is overdue. | Should |
| US-064 | As a user, I want to configure reminder schedules (e.g., 3 days before due, on due date, 7 days after). | Could |

### Dashboard & Analytics

| ID | Story | Priority |
|---|---|---|
| US-070 | As a user, I want a dashboard that shows total revenue, outstanding invoices, and overdue amounts at a glance. | Must |
| US-071 | As a user, I want to see a revenue trend chart by month. | Should |
| US-072 | As a user, I want to filter invoices by status (draft, sent, paid, overdue, void). | Must |
| US-073 | As a user, I want to export my invoice data as CSV for accounting purposes. | Should |

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

- **FR-AUTH-001:** Email/password registration with email verification.
- **FR-AUTH-002:** OAuth 2.0 social login via Google.
- **FR-AUTH-003:** JWT-based session management with refresh token rotation.
- **FR-AUTH-004:** Password reset via time-limited email token.
- **FR-AUTH-005:** Role-based access control: `owner`, `member` (Agency tier only).
- **FR-AUTH-006:** GDPR-compliant account deletion that purges all PII within 30 days.

### 4.2 Company Profile Management

- **FR-PROFILE-001:** Store company name, logo (PNG/JPG/SVG, max 2MB), address, email, phone, website, tax registration number.
- **FR-PROFILE-002:** Default currency selection from ISO 4217 list.
- **FR-PROFILE-003:** Default payment terms (Net 7, 14, 30, 60, or custom days).
- **FR-PROFILE-004:** Invoice number series configuration (prefix, starting number, auto-increment).
- **FR-PROFILE-005:** Multiple company profiles per account (Agency tier; max 5 profiles).
- **FR-PROFILE-006:** Brand customisation: primary color, accent color, font family selection (3 options).

### 4.3 Client Management

- **FR-CLIENT-001:** CRUD operations for clients.
- **FR-CLIENT-002:** Client fields: display name, legal name, billing address, email, phone, default currency, VAT/tax ID, notes.
- **FR-CLIENT-003:** Client country used to determine applicable tax rules.
- **FR-CLIENT-004:** Soft delete (archive) rather than hard delete to preserve invoice history.
- **FR-CLIENT-005:** CSV import with field mapping UI (max 500 clients per import).
- **FR-CLIENT-006:** Client-level invoice history and payment summary.

### 4.4 AI Invoice Generation

- **FR-AI-001:** Natural language input field (up to 1,000 characters) processed by an LLM.
- **FR-AI-002:** Entity extraction: client name, service description(s), quantity, unit, rate, currency, due date/terms.
- **FR-AI-003:** Client fuzzy-matching against the user's saved client list; prompt for confirmation if confidence < 90%.
- **FR-AI-004:** Automatic tax determination based on supplier country, client country, client VAT status, and supply type (goods/services).
- **FR-AI-005:** Support for: standard VAT, zero-rated VAT, reverse-charge VAT (EU B2B), GST (Australia/Canada/India/Singapore), sales tax (US — state-level advisory only), no tax.
- **FR-AI-006:** Multi-line-item extraction from a single prompt (e.g., "20 hours dev work and 5 hours design").
- **FR-AI-007:** Follow-up clarification for missing required fields (one question at a time).
- **FR-AI-008:** AI processing must return a draft invoice within 10 seconds (p95 latency).

### 4.5 Invoice Editor

- **FR-EDITOR-001:** Editable fields: invoice number, issue date, due date, client (dropdown), currency, line items (description, quantity, unit, unit price), discount, tax rate, notes, payment terms.
- **FR-EDITOR-002:** Line item CRUD with drag-to-reorder.
- **FR-EDITOR-003:** Discount: percentage or fixed amount, applied before tax.
- **FR-EDITOR-004:** Tax calculation: subtotal → discount → taxable amount → tax → total.
- **FR-EDITOR-005:** Real-time total recalculation on any field change.
- **FR-EDITOR-006:** Inline PDF preview panel (renders within 2 seconds of edit).
- **FR-EDITOR-007:** Save as draft at any point.
- **FR-EDITOR-008:** Duplicate existing invoice to create a new one.

### 4.6 PDF Generation

- **FR-PDF-001:** Server-side PDF generation using a consistent, print-safe template engine.
- **FR-PDF-002:** Invoice template includes: logo, company details, client details, invoice number, issue/due dates, line items table, subtotal, discount, tax breakdown, total, payment instructions, notes, Stripe payment link (as clickable URL and QR code).
- **FR-PDF-003:** PDF must comply with: EN 16931 (European e-invoice standard) field requirements.
- **FR-PDF-004:** PDF filename format: `INV-{number}-{ClientName}-{Date}.pdf`.
- **FR-PDF-005:** PDF download available immediately after generation; stored securely for 5 years.

### 4.7 Email Delivery

- **FR-EMAIL-001:** Send invoice email to client from a platform-managed `noreply@billcraft.ai` address with user's name in the From display name.
- **FR-EMAIL-002:** Custom send message body (plain text, max 500 characters).
- **FR-EMAIL-003:** Invoice PDF attached to email and payment link embedded in email body.
- **FR-EMAIL-004:** Delivery status tracking (sent, delivered, bounced) via email provider webhooks.
- **FR-EMAIL-005:** Automated overdue reminders: configurable schedule, sent from platform, include invoice link and payment link.
- **FR-EMAIL-006:** Pro/Agency tier: custom sending domain via DKIM setup (user's own domain).

### 4.8 Payments (Stripe Integration)

- **FR-PAY-001:** Stripe Connect (Standard or Express) for user to connect their own Stripe account.
- **FR-PAY-002:** Generate a Stripe Payment Link per invoice with the correct amount and currency.
- **FR-PAY-003:** Stripe webhook listener to update invoice status to `paid` upon successful payment.
- **FR-PAY-004:** Display payment receipt details (payment date, Stripe charge ID) on the invoice record.
- **FR-PAY-005:** Manual mark-as-paid with date and notes field (for off-platform payments).
- **FR-PAY-006:** Void invoice (cannot be paid after voiding; replaced by a credit note entry).

### 4.9 Multi-Currency Support

- **FR-CURR-001:** Support all ISO 4217 currencies; display using locale-appropriate formatting.
- **FR-CURR-002:** Exchange rate display (informational only) fetched from an FX rate API, updated daily.
- **FR-CURR-003:** Invoice currency set per invoice, independent of account default.
- **FR-CURR-004:** Dashboard totals converted to account base currency for aggregation.

### 4.10 Tax & VAT Support

| Tax System | Region | Rule Applied |
|---|---|---|
| VAT (standard) | EU, UK, UAE, others | Rate per country, applied to taxable supply |
| VAT (reverse-charge) | EU B2B cross-border | Zero-rated with "VAT: Reverse Charge" notation |
| GST | Australia, India, Canada, Singapore | Country-specific rate |
| Sales Tax | USA | Advisory note only; rate not auto-calculated |
| None | B2B export outside tax zone | Zero-rated |

- **FR-TAX-001:** Tax rule engine based on supplier country × client country × VAT registration status.
- **FR-TAX-002:** Manual override of calculated tax rule with a plain-language explanation of the override.
- **FR-TAX-003:** Multi-line tax breakdown on invoice when multiple rates apply.
- **FR-TAX-004:** Tax report export (CSV) showing total tax collected per period per rate.

### 4.11 Invoice Status Tracking

Invoice lifecycle states: `draft` → `sent` → `viewed` → `paid` | `overdue` | `void`

- **FR-STATUS-001:** Automatic transition to `overdue` at midnight UTC on the day after the due date.
- **FR-STATUS-002:** Track `viewed` event via a 1×1 pixel tracking image in the invoice email.
- **FR-STATUS-003:** Audit log of all status transitions with timestamp and actor.

### 4.12 Dashboard & Analytics

- **FR-DASH-001:** KPI cards: total invoiced (current month), total collected (current month), total outstanding, total overdue.
- **FR-DASH-002:** Revenue trend: bar chart, last 12 months, grouped by month.
- **FR-DASH-003:** Invoice list with filters: status, client, date range, currency.
- **FR-DASH-004:** Top clients by revenue (current year).
- **FR-DASH-005:** CSV export of filtered invoice list.
- **FR-DASH-006:** Agency tier: revenue breakdown by company profile.

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target |
|---|---|
| AI invoice draft generation | < 10s (p95) |
| PDF generation | < 5s (p95) |
| Page load (initial) | < 3s on 4G mobile |
| API response time (non-AI) | < 500ms (p99) |
| Dashboard load | < 2s |

### 5.2 Availability & Reliability

- **NFR-REL-001:** 99.9% monthly uptime SLA (excluding scheduled maintenance).
- **NFR-REL-002:** Scheduled maintenance windows announced 48 hours in advance, between 02:00–04:00 UTC Saturday.
- **NFR-REL-003:** Data backed up daily with 30-day retention; point-in-time recovery within 1 hour.
- **NFR-REL-004:** Graceful degradation: if the AI service is unavailable, fall back to a manual invoice form with a visible notice.

### 5.3 Security

- **NFR-SEC-001:** All data encrypted in transit (TLS 1.3) and at rest (AES-256).
- **NFR-SEC-002:** Passwords stored using bcrypt (cost factor ≥ 12).
- **NFR-SEC-003:** OWASP Top 10 mitigations applied (XSS, SQLi, CSRF, broken auth, etc.).
- **NFR-SEC-004:** Rate limiting on authentication endpoints (max 10 attempts per minute per IP).
- **NFR-SEC-005:** API keys and secrets managed via environment secrets manager (never in code or logs).
- **NFR-SEC-006:** Penetration test before public launch; annual thereafter.
- **NFR-SEC-007:** Stripe PCI DSS compliance via Stripe's certified infrastructure (no card data stored on BillCraft servers).

### 5.4 Privacy & Compliance

- **NFR-PRIV-001:** GDPR Article 17 — right to erasure implemented; PII deleted within 30 days of request.
- **NFR-PRIV-002:** GDPR Article 15 — data export available in machine-readable format (JSON/CSV).
- **NFR-PRIV-003:** Cookie consent banner compliant with ePrivacy Directive; no non-essential cookies without consent.
- **NFR-PRIV-004:** Data Processing Agreement (DPA) available for EU users; records of processing activities maintained.
- **NFR-PRIV-005:** User prompt data sent to the LLM provider must be anonymised or processed under a data processing agreement with the provider.

### 5.5 Scalability

- **NFR-SCALE-001:** Architecture must support horizontal scaling; stateless API tier.
- **NFR-SCALE-002:** Database read replicas for analytics/reporting queries.
- **NFR-SCALE-003:** Async job queue for PDF generation, email delivery, and AI calls.
- **NFR-SCALE-004:** CDN delivery for static assets and generated PDFs.

### 5.6 Localisation & Internationalisation

- **NFR-I18N-001:** UI initially in English; architecture must support i18n (i18next or equivalent) for future locale additions.
- **NFR-I18N-002:** Date formats rendered per user locale.
- **NFR-I18N-003:** Number and currency formats rendered per invoice currency locale.
- **NFR-I18N-004:** Invoice PDFs must support UTF-8 character sets (for names/addresses in non-Latin scripts).

### 5.7 Accessibility

- **NFR-A11Y-001:** WCAG 2.1 Level AA compliance for the web application.
- **NFR-A11Y-002:** All form elements have associated labels; keyboard navigation fully supported.

---

## 6. MVP Scope

The MVP targets the **Free** and **Pro** tiers, validating core AI-invoice generation and payment collection.

### In Scope for MVP

| Area | Features Included |
|---|---|
| Auth | Email/password + Google OAuth, email verification, password reset |
| Profile | Single company profile, logo upload, default currency/tax/payment terms |
| Clients | Add/edit/archive clients, manual entry only |
| AI Generation | Single-prompt invoice generation, entity extraction, tax rule engine (VAT, GST), client fuzzy-match |
| Invoice Editor | Full field editing, line item CRUD, discount, live preview |
| PDF | Server-side PDF generation, download |
| Email | Send invoice to client with PDF attachment and Stripe payment link |
| Payments | Stripe Connect integration, automatic paid status via webhook, manual mark-as-paid |
| Status Tracking | Draft → Sent → Paid → Overdue state machine, overdue auto-transition |
| Dashboard | KPI cards, invoice list with status filter, monthly revenue chart |
| Subscription | Free (3 invoices/month) and Pro ($10/month) via Stripe Billing |
| Multi-currency | Invoice-level currency selection, 20 major currencies |
| Tax | VAT (standard + reverse-charge EU B2B), Australian GST, Canadian GST/HST |

### Out of Scope for MVP

- Agency tier features (multiple profiles, team seats)
- Custom sending domain
- CSV import
- Mobile app
- Overdue reminder configuration (MVP uses a fixed 7-day-overdue single reminder)
- US sales tax calculation
- Accounting integrations (QuickBooks, Xero)
- AI memory of user-specific shorthand

---

## 7. Future Roadmap

### Phase 2 — Q3 2026 (Post-MVP)

- **Agency Tier:** Multiple company profiles (up to 5), 3 team seats with role-based access.
- **Overdue Reminder Configuration:** Custom reminder schedules with multiple touchpoints.
- **CSV Client Import:** Bulk client onboarding.
- **Custom Sending Domain:** DKIM-verified custom domain for Pro and Agency.
- **AI Memory:** User-specific shorthand for frequent clients and service descriptions.
- **US Sales Tax Advisory:** Rate lookup by US state (informational; not automated filing).

### Phase 3 — Q4 2026

- **Accounting Integrations:** QuickBooks Online and Xero two-way sync.
- **Recurring Invoices:** Schedule repeating invoices (weekly, monthly, custom).
- **Expense Tracking:** Log billable expenses and add to invoices.
- **Client Portal:** Branded page where clients can view and pay all invoices.
- **Mobile Web Optimisation:** Full responsive design pass for mobile-first use.

### Phase 4 — Q1 2027

- **Native Mobile Apps:** iOS and Android apps with camera receipt scanning.
- **Proposals / Quotes:** Convert accepted proposals to invoices in one click.
- **Time Tracking:** Built-in timer to track billable hours, auto-populate invoice line items.
- **Xero/QuickBooks GL Sync:** Map tax codes to chart-of-accounts entries.
- **Additional Languages:** UI localisation for Spanish, French, German, Arabic.

### Phase 5 — 2027 and Beyond

- **AI Financial Insights:** Cash flow forecasting, payment prediction, client credit scoring.
- **Banking Integrations:** Open Banking (UK/EU PSD2) reconciliation.
- **Enterprise Tier:** SSO (SAML), advanced audit logs, SLA-backed support, unlimited seats.
- **Marketplace / API:** Public API and webhook system for third-party integrations.

---

## 8. Success Metrics

### 8.1 Acquisition

| Metric | 3-Month Target | 12-Month Target |
|---|---|---|
| Registered users | 500 | 5,000 |
| Weekly active users (WAU) | 150 | 1,500 |
| Organic traffic (SEO) | 1,000 sessions/month | 15,000 sessions/month |

### 8.2 Activation

| Metric | Target |
|---|---|
| Users who generate ≥ 1 invoice within 24h of signup | ≥ 60% |
| Time to first invoice sent | < 5 minutes (median) |
| AI invoice acceptance rate (no edits needed) | ≥ 70% |

### 8.3 Retention & Engagement

| Metric | Target |
|---|---|
| Month-1 retention (users active in month after signup) | ≥ 40% |
| Month-3 retention | ≥ 25% |
| Average invoices created per active user per month | ≥ 4 |

### 8.4 Revenue

| Metric | 6-Month Target | 12-Month Target |
|---|---|---|
| Monthly Recurring Revenue (MRR) | $2,000 | $15,000 |
| Free → Pro conversion rate | ≥ 8% | ≥ 12% |
| Pro → Agency upgrade rate | — | ≥ 10% of Pro users |
| Annual churn rate | — | < 20% |

### 8.5 Satisfaction

| Metric | Target |
|---|---|
| Net Promoter Score (NPS) | ≥ 40 |
| CSAT (post-invoice survey) | ≥ 4.2 / 5.0 |
| Support ticket rate | < 5% of MAU/month |

### 8.6 Compliance & Quality

| Metric | Target |
|---|---|
| Invoice PDF passing EN 16931 field validation | 100% |
| AI tax rule accuracy (QA tested) | ≥ 98% |
| Uptime | ≥ 99.9% |
| GDPR deletion request fulfilment | 100% within 30 days |

---

## 9. Database Entities

### 9.1 Entity Relationship Overview

```
User ──< CompanyProfile ──< Invoice ──< LineItem
 |              |               |
 |              └──< Client     └── TaxLine
 └── Subscription               └── Payment
```

---

### 9.2 `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | |
| `password_hash` | VARCHAR(255) | NULLABLE | Null for OAuth-only accounts |
| `email_verified_at` | TIMESTAMPTZ | NULLABLE | |
| `google_sub` | VARCHAR(255) | UNIQUE, NULLABLE | Google OAuth subject ID |
| `stripe_customer_id` | VARCHAR(255) | NULLABLE | Stripe Billing customer |
| `subscription_tier` | ENUM | NOT NULL | `free`, `pro`, `agency` |
| `subscription_status` | ENUM | NOT NULL | `active`, `trialing`, `past_due`, `cancelled` |
| `invoice_count_month` | INT | NOT NULL, DEFAULT 0 | Resets monthly for Free tier enforcement |
| `invoice_count_reset_at` | TIMESTAMPTZ | NOT NULL | |
| `gdpr_deletion_requested_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.3 `company_profiles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Legal company name |
| `display_name` | VARCHAR(255) | NULLABLE | |
| `logo_url` | VARCHAR(500) | NULLABLE | CDN URL |
| `address_line1` | VARCHAR(255) | NOT NULL | |
| `address_line2` | VARCHAR(255) | NULLABLE | |
| `city` | VARCHAR(100) | NOT NULL | |
| `state_province` | VARCHAR(100) | NULLABLE | |
| `postal_code` | VARCHAR(20) | NULLABLE | |
| `country_code` | CHAR(2) | NOT NULL | ISO 3166-1 alpha-2 |
| `email` | VARCHAR(255) | NOT NULL | |
| `phone` | VARCHAR(50) | NULLABLE | |
| `website` | VARCHAR(255) | NULLABLE | |
| `tax_registration_number` | VARCHAR(100) | NULLABLE | VAT/GST/TRN number |
| `default_currency` | CHAR(3) | NOT NULL | ISO 4217 |
| `default_payment_terms_days` | INT | NOT NULL, DEFAULT 14 | |
| `invoice_number_prefix` | VARCHAR(20) | NOT NULL, DEFAULT 'INV' | |
| `invoice_number_next` | INT | NOT NULL, DEFAULT 1 | |
| `brand_primary_color` | CHAR(7) | NOT NULL, DEFAULT '#1A73E8' | Hex |
| `brand_accent_color` | CHAR(7) | NOT NULL, DEFAULT '#34A853' | Hex |
| `stripe_account_id` | VARCHAR(255) | NULLABLE | Stripe Connect account |
| `stripe_account_status` | ENUM | NULLABLE | `pending`, `active`, `restricted` |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.4 `clients`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_profile_id` | UUID | FK → company_profiles, NOT NULL | |
| `display_name` | VARCHAR(255) | NOT NULL | Name used in AI matching |
| `legal_name` | VARCHAR(255) | NULLABLE | |
| `email` | VARCHAR(255) | NOT NULL | |
| `phone` | VARCHAR(50) | NULLABLE | |
| `address_line1` | VARCHAR(255) | NULLABLE | |
| `address_line2` | VARCHAR(255) | NULLABLE | |
| `city` | VARCHAR(100) | NULLABLE | |
| `state_province` | VARCHAR(100) | NULLABLE | |
| `postal_code` | VARCHAR(20) | NULLABLE | |
| `country_code` | CHAR(2) | NOT NULL | |
| `default_currency` | CHAR(3) | NULLABLE | |
| `vat_number` | VARCHAR(50) | NULLABLE | EU VAT registration number |
| `is_vat_registered` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `notes` | TEXT | NULLABLE | |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.5 `invoices`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_profile_id` | UUID | FK → company_profiles, NOT NULL | |
| `client_id` | UUID | FK → clients, NULLABLE | Null allowed for one-off invoices |
| `invoice_number` | VARCHAR(50) | NOT NULL | Formatted: `INV-0042` |
| `status` | ENUM | NOT NULL | `draft`, `sent`, `viewed`, `paid`, `overdue`, `void` |
| `currency` | CHAR(3) | NOT NULL | |
| `issue_date` | DATE | NOT NULL | |
| `due_date` | DATE | NOT NULL | |
| `subtotal` | NUMERIC(15,2) | NOT NULL | |
| `discount_type` | ENUM | NULLABLE | `percentage`, `fixed` |
| `discount_value` | NUMERIC(15,2) | NULLABLE | |
| `discount_amount` | NUMERIC(15,2) | NULLABLE | Calculated |
| `taxable_amount` | NUMERIC(15,2) | NOT NULL | After discount |
| `total_tax` | NUMERIC(15,2) | NOT NULL, DEFAULT 0 | |
| `total` | NUMERIC(15,2) | NOT NULL | |
| `notes` | TEXT | NULLABLE | |
| `payment_terms_text` | VARCHAR(500) | NULLABLE | |
| `ai_prompt` | TEXT | NULLABLE | Original user prompt for audit |
| `pdf_url` | VARCHAR(500) | NULLABLE | CDN URL |
| `stripe_payment_link_id` | VARCHAR(255) | NULLABLE | |
| `stripe_payment_link_url` | VARCHAR(500) | NULLABLE | |
| `shareable_token` | CHAR(64) | UNIQUE, NOT NULL | For shareable invoice link |
| `email_sent_at` | TIMESTAMPTZ | NULLABLE | |
| `email_viewed_at` | TIMESTAMPTZ | NULLABLE | |
| `paid_at` | TIMESTAMPTZ | NULLABLE | |
| `paid_manually` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `void_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.6 `line_items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `invoice_id` | UUID | FK → invoices, NOT NULL | |
| `sort_order` | INT | NOT NULL | For display ordering |
| `description` | TEXT | NOT NULL | |
| `quantity` | NUMERIC(10,3) | NOT NULL | |
| `unit` | VARCHAR(50) | NULLABLE | e.g., `hours`, `days`, `units` |
| `unit_price` | NUMERIC(15,2) | NOT NULL | |
| `amount` | NUMERIC(15,2) | NOT NULL | quantity × unit_price |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.7 `tax_lines`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `invoice_id` | UUID | FK → invoices, NOT NULL | |
| `tax_name` | VARCHAR(100) | NOT NULL | e.g., `VAT 20%`, `GST 10%`, `Reverse Charge` |
| `tax_rate` | NUMERIC(5,4) | NOT NULL | e.g., `0.2000` for 20% |
| `taxable_amount` | NUMERIC(15,2) | NOT NULL | |
| `tax_amount` | NUMERIC(15,2) | NOT NULL | |
| `is_reverse_charge` | BOOLEAN | NOT NULL, DEFAULT FALSE | |

---

### 9.8 `payments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `invoice_id` | UUID | FK → invoices, NOT NULL | |
| `amount` | NUMERIC(15,2) | NOT NULL | |
| `currency` | CHAR(3) | NOT NULL | |
| `method` | ENUM | NOT NULL | `stripe`, `manual` |
| `stripe_charge_id` | VARCHAR(255) | NULLABLE | |
| `stripe_payment_intent_id` | VARCHAR(255) | NULLABLE | |
| `paid_at` | TIMESTAMPTZ | NOT NULL | |
| `notes` | TEXT | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.9 `invoice_events` (Audit Log)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `invoice_id` | UUID | FK → invoices, NOT NULL | |
| `event_type` | VARCHAR(50) | NOT NULL | e.g., `status_changed`, `email_sent`, `viewed` |
| `from_status` | VARCHAR(20) | NULLABLE | |
| `to_status` | VARCHAR(20) | NULLABLE | |
| `actor_user_id` | UUID | NULLABLE | Null for system events |
| `metadata` | JSONB | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

---

### 9.10 `reminder_logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `invoice_id` | UUID | FK → invoices, NOT NULL | |
| `reminder_type` | ENUM | NOT NULL | `pre_due`, `on_due`, `overdue_7d`, `overdue_14d` |
| `sent_at` | TIMESTAMPTZ | NOT NULL | |
| `delivery_status` | ENUM | NOT NULL | `sent`, `delivered`, `bounced` |

---

## 10. API Requirements

### 10.1 Design Principles

- **Protocol:** REST over HTTPS
- **Format:** JSON request/response bodies; `Content-Type: application/json`
- **Versioning:** URL prefix `/api/v1/`
- **Authentication:** Bearer token (JWT) in `Authorization` header
- **Error format:**
```json
{
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice with ID abc123 not found.",
    "status": 404
  }
}
```
- **Pagination:** Cursor-based pagination via `?cursor=` and `?limit=` (default 20, max 100)
- **Rate Limiting:** 100 requests/minute per user; 429 response with `Retry-After` header

---

### 10.2 Authentication Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user (email + password) |
| `POST` | `/api/v1/auth/login` | Login, return access + refresh tokens |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh token for new access token |
| `POST` | `/api/v1/auth/password/reset-request` | Send password reset email |
| `POST` | `/api/v1/auth/password/reset` | Complete password reset with token |
| `POST` | `/api/v1/auth/google` | Google OAuth callback, return tokens |
| `DELETE` | `/api/v1/auth/account` | Request account deletion (GDPR) |

---

### 10.3 Company Profile Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/profiles` | List user's company profiles |
| `POST` | `/api/v1/profiles` | Create a new company profile |
| `GET` | `/api/v1/profiles/:id` | Get profile details |
| `PATCH` | `/api/v1/profiles/:id` | Update profile fields |
| `DELETE` | `/api/v1/profiles/:id` | Archive profile |
| `POST` | `/api/v1/profiles/:id/logo` | Upload logo (multipart/form-data) |
| `POST` | `/api/v1/profiles/:id/stripe/connect` | Initiate Stripe Connect OAuth flow |
| `DELETE` | `/api/v1/profiles/:id/stripe/connect` | Disconnect Stripe account |

---

### 10.4 Client Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/clients` | List clients (supports `?profile_id=`, `?search=`, `?archived=`) |
| `POST` | `/api/v1/clients` | Create a client |
| `GET` | `/api/v1/clients/:id` | Get client details |
| `PATCH` | `/api/v1/clients/:id` | Update client |
| `DELETE` | `/api/v1/clients/:id` | Archive client |
| `POST` | `/api/v1/clients/import` | CSV import (multipart/form-data) |
| `GET` | `/api/v1/clients/:id/invoices` | List all invoices for a client |

---

### 10.5 AI Invoice Generation Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/ai/generate` | Generate invoice draft from natural language prompt |
| `POST` | `/api/v1/ai/clarify` | Submit answer to AI follow-up question |

**`POST /api/v1/ai/generate` — Request Body:**
```json
{
  "profile_id": "uuid",
  "prompt": "Create an invoice for Acme Inc. for website redesign services, 20 hours at $75/hr, due in 14 days.",
  "session_id": "optional-uuid-for-follow-up-context"
}
```

**Response (success):**
```json
{
  "status": "draft_ready",
  "invoice_draft": { ... },
  "session_id": "uuid"
}
```

**Response (clarification needed):**
```json
{
  "status": "clarification_needed",
  "question": "I found two clients matching 'Acme' — did you mean 'Acme Inc.' or 'Acme Digital'?",
  "options": ["Acme Inc.", "Acme Digital"],
  "session_id": "uuid"
}
```

---

### 10.6 Invoice Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/invoices` | List invoices (supports `?status=`, `?client_id=`, `?from=`, `?to=`, `?currency=`) |
| `POST` | `/api/v1/invoices` | Create invoice manually (no AI) |
| `GET` | `/api/v1/invoices/:id` | Get invoice details (includes line items, tax lines, payments, events) |
| `PATCH` | `/api/v1/invoices/:id` | Update invoice (draft only) |
| `DELETE` | `/api/v1/invoices/:id` | Delete draft invoice |
| `POST` | `/api/v1/invoices/:id/send` | Generate PDF, create Stripe payment link, send email |
| `POST` | `/api/v1/invoices/:id/duplicate` | Duplicate invoice as new draft |
| `POST` | `/api/v1/invoices/:id/mark-paid` | Manually mark as paid |
| `POST` | `/api/v1/invoices/:id/void` | Void an invoice |
| `GET` | `/api/v1/invoices/:id/pdf` | Download PDF (redirect to CDN signed URL) |
| `GET` | `/api/v1/invoices/:id/events` | Get audit log for invoice |
| `POST` | `/api/v1/invoices/:id/reminder` | Manually trigger overdue reminder email |

**Public endpoint (no auth — for client-facing invoice view):**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/public/invoices/:token` | View invoice by shareable token (marks `viewed`) |

---

### 10.7 Dashboard Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | KPI cards (total invoiced, collected, outstanding, overdue) |
| `GET` | `/api/v1/dashboard/revenue-trend` | Monthly revenue (last 12 months) |
| `GET` | `/api/v1/dashboard/top-clients` | Top 5 clients by revenue (current year) |
| `GET` | `/api/v1/invoices/export` | CSV export of filtered invoice list |

---

### 10.8 Webhook Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/webhooks/stripe` | Receive Stripe events (payment succeeded, account updated) |
| `POST` | `/api/webhooks/email` | Receive email delivery status events |

All webhook endpoints validate signatures before processing. Stripe webhooks use `Stripe-Signature` header + webhook secret. Email webhooks use HMAC-SHA256 signature.

---

### 10.9 Subscription Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/subscription` | Get current subscription details |
| `POST` | `/api/v1/subscription/checkout` | Create Stripe Billing checkout session |
| `POST` | `/api/v1/subscription/portal` | Create Stripe Customer Portal session |
| `GET` | `/api/v1/subscription/usage` | Get current month invoice count vs. limit |

---

*End of Document*

---

**Document Control**

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 | 2026-06-22 | Product Team | Initial draft |