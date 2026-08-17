# Trading Company Org Category — Codebase Research

Grounding notes for scoping the new "Trading Company" org category (Incoterms, HS codes,
PO references, proforma→commercial invoice conversion) before designing the migration
and UI changes.

---

## 1. Schema

**`organizations`** (`supabase/migrations/001_initial_schema.sql`)
```sql
id, name, slug, default_currency CHAR(3), timezone, locale,
tax_registration_number, logo_url,
address_line1/2, city, state, postal_code, country_code,
website,
invoice_prefix VARCHAR(20) DEFAULT 'INV',
invoice_number_format VARCHAR(50) DEFAULT '{PREFIX}-{YEAR}-{NUM:04d}',  -- stored but not actually parsed, see §6
next_invoice_number INT DEFAULT 1,
next_estimate_number INT DEFAULT 1,          -- added in add_estimates.sql
freepass_plan, freepass_until,                -- admin override, see §3
trial_ends_at,                                -- added in add_trial_to_organizations.sql
created_at, updated_at, deleted_at
```
No "org category" or org-type flag exists anywhere in the schema today — a Trading Company category would be new ground, not an extension of an existing field.

**`invoices`**
```sql
id, organization_id FK, client_id FK, created_by FK,
invoice_number VARCHAR(100),
status invoice_status,                        -- Postgres ENUM
issue_date, due_date,
currency CHAR(3), exchange_rate NUMERIC(18,8),
subtotal, discount_amount, tax_amount, total, amount_paid NUMERIC(15,2),
amount_due NUMERIC(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,   -- generated
tax_type tax_type,                            -- Postgres ENUM
tax_rate, tax_registration_number,
payment_instructions, locale, notes, terms,
sent_at, viewed_at, paid_at,
created_at, updated_at, deleted_at
UNIQUE (organization_id, invoice_number)
```

**`invoice_items`**
```sql
id, invoice_id FK, organization_id FK,
description, quantity NUMERIC(15,4), unit_price NUMERIC(15,4),
tax_rate (nullable — inherits invoice's if null),
tax_amount, discount_amount, subtotal, total,
sort_order, created_at, updated_at
```
No generated columns here — `subtotal`/`total` are computed in app code and written directly.

**`estimates`** (`add_estimates.sql`)
```sql
id, organization_id FK, client_id FK, created_by FK,
estimate_number TEXT,
status TEXT CHECK (status IN ('draft','sent','viewed','accepted','declined','expired'))   -- NOT a Postgres ENUM, plain CHECK constraint
issue_date, expiry_date,
currency, subtotal, discount_amount,
tax_type TEXT CHECK (...), tax_rate, tax_amount, total,
notes, terms,
sent_at, viewed_at, responded_at, response_note,
share_token UUID UNIQUE DEFAULT gen_random_uuid(),
converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,   -- see §2
created_at, updated_at, deleted_at
```

**`estimate_items`** — same shape as `invoice_items` minus `tax_rate`/`tax_amount`/`discount_amount` columns (estimates don't do per-line tax).

**Generated columns overall:** only two in the whole schema — `invoices.amount_due` and `ai_requests.total_tokens`. Everything else, including estimate totals, is computed in TypeScript and inserted as plain values.

**Enums (Postgres `CREATE TYPE`):**
`user_role`, `auth_provider_type`, `invoice_status`, `tax_type`, `payment_status_type`, `payment_method_type`, `payment_gateway`, `subscription_status`, `billing_cycle`, `email_status`, `ai_feature`, `audit_action`. No `document_type` enum exists — invoices and estimates are entirely separate tables, not a shared document type. Estimate status is a CHECK constraint, not an enum, so extending it (e.g. adding `proforma`-specific states) doesn't require an `ALTER TYPE`.

---

## 2. Estimate → Invoice conversion flow

Function: `convertToInvoiceAction(id)` in `app/actions/estimates.ts:310`.

1. Fetch the estimate, its `estimate_items`, and the org's `invoice_prefix`.
2. Call `rpc('next_invoice_number', { p_org_id })` — allocates and increments the org's invoice counter (see §6).
3. **Insert a new `invoices` row** (not an update-in-place) copying: `client_id`, `currency`, `subtotal`, `discount_amount`, `tax_type`, `tax_rate`, `tax_amount`, `total`, `notes`. Sets `status: 'draft'`, `issue_date: today`, `due_date: null`, `amount_paid: 0`. `estimate.terms` is **not** copied over (dropped).
4. Copy each `estimate_items` row into `invoice_items` (new rows, new UUIDs), setting `tax_rate: null`, `tax_amount: 0`, `discount_amount: 0` regardless of source.
5. Update the *original* estimate row: `status: 'accepted'`, `responded_at: now`, `converted_invoice_id: <new invoice id>`.
6. Revalidate `/estimates`, `/estimates/[id]`, `/invoices`.

**Linkage:** one-way FK `estimates.converted_invoice_id → invoices.id` (`ON DELETE SET NULL`). Invoices have no back-reference to the estimate they came from. For a proforma→commercial pattern you'd want the same shape: a nullable FK on the *new* document pointing back, or mirror this exact `converted_invoice_id` pattern on `invoices` (e.g. `source_proforma_id`).

---

## 3. Plan gating — `getPlanStatus()`

Defined in `lib/subscription.ts:28`. Signature: `getPlanStatus(orgId, supabase) → Promise<PlanStatus>`.

Returns:
```ts
{
  status: 'trial' | 'active' | 'expired'
  plan: string
  trialEndsAt, trialDaysLeft: number | null
  clientLimit, invoiceMonthlyLimit: number   // -1 = unlimited
  currentClientCount, currentMonthInvoiceCount: number
  canCreateClient, canCreateInvoice: boolean
  canUseAI, canUseExpenses, canUseRecurring, canUseTemplates: boolean
}
```

Resolution order (first match wins):
1. **Freepass** — `org.freepass_until > now && org.freepass_plan` set → unlimited clients/invoices, Pro-feature flags = `PRO_PLANS.has(freepass_plan)`.
2. **Active paid subscription** (`subscriptions` table, `status='active'`) — `basic` plan gets fixed limits (5 clients / 20 invoices-per-month, all Pro flags false); `pro`/`agency` get unlimited + all flags true.
3. **Trial** (`org.trial_ends_at > now`) — all Pro flags true, but capped at `TRIAL_CLIENT_LIMIT=1` / `TRIAL_INVOICE_MONTHLY_LIMIT=5`.
4. **Expired** — everything `false`/`0`.

There's no per-feature granularity beyond the four boolean flags — a Trading Company category would need a new flag added to this same struct (e.g. `canUseTradingFields`) plus a branch in whichever tier should unlock it.

**Call sites (14 total):**
- API routes: `app/api/ai/extract-invoice/route.ts`, `app/api/ai/draft-reminder/route.ts` — enforcement (403 if flag false)
- Server actions: `app/actions/clients.ts`, `invoices.ts`, `recurring.ts`, `expenses.ts`, `templates.ts`, `email-templates.ts` — enforcement before mutation
- Page components (Server Components): `app/(app)/recurring/page.tsx`, `expenses/page.tsx`, `templates/page.tsx`, `invoices/[id]/page.tsx`, `settings/email-templates/page.tsx` — gate UI rendering (upsell banners, disabled controls)

Both layers check it independently — there's no shared middleware-level gate, so a new trading-fields flag would need to be checked in both the mutating action and the relevant page component, same as existing features.

---

## 4. AI extraction

Route: `app/api/ai/extract-invoice/route.ts`. Plan-gated via `getPlanStatus().canUseAI` before calling OpenAI.

**Response schema (Zod, enforced after parse):**
```ts
{
  client_name: string | null
  client_id: string | null
  items: [{ description: string, quantity: number, unit_price: number }]
  currency: string | null
  issue_date: string | null
  due_date: string | null
  notes: string | null
  payment_instructions: string | null
  confidence: { client: number, items: number, currency: number, dates: number, overall: number }
}
```
Confidence is one object with five fixed dimensions — not per-line-item. There's no per-field confidence beyond those five buckets, so a trading-specific field (Incoterm, HS code) extracted by AI wouldn't have a natural confidence slot without extending this object.

**System prompt (verbatim, from lines 116–139):**
```
You are an invoice extraction assistant. Extract structured invoice data from a natural language description and return ONLY valid JSON matching this exact structure:

{
  "client_name": string | null,
  "client_id": string | null,
  "items": [{ "description": string, "quantity": number, "unit_price": number }],
  "currency": string | null,
  "issue_date": string | null,
  "due_date": string | null,
  "notes": string | null,
  "payment_instructions": string | null,
  "confidence": { "client": number, "items": number, "currency": number, "dates": number, "overall": number }
}

Available clients:
${clientList}

Rules:
- Match client_id to the exact id from the client list above, or null if not matched.
- Quantities and prices must be positive numbers.
- Dates must be ISO 8601 (YYYY-MM-DD). Today is ${today}. Resolve relative dates (e.g. "in 14 days" adds 14 to today).
- Default currency: ${currency}. Use the default if not mentioned.
- Confidence values are 0.0–1.0 per dimension.
- Return only the JSON object, no other text.
```
Model: `gpt-4o`, `temperature: 0`, `max_tokens: 800`, `response_format: { type: 'json_object' }`. No system-level "org context" (e.g. org category) is currently injected into the prompt at all — today it only injects the client list, today's date, and default currency.

**`node:https` wrapper** (lines 40–77) — `callOpenAI(apiKey, payload)`:
```ts
function callOpenAI(apiKey: string, payload: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload))
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': body.length },
      agent: new https.Agent({ keepAlive: false }),
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => { /* JSON.parse, reject on status >= 400 */ })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}
```
To branch the prompt by org category, the natural seam is right before the `payload` object is built (line 108) — you'd fetch `org.category` alongside the existing client/currency fetch and switch the `system` message content (and possibly the `responseSchema`) based on it.

---

## 5. PDF templates

**One component per document type**, not one component with conditionals: `lib/pdf/invoice-pdf.tsx` (`InvoicePDF`) and `lib/pdf/estimate-pdf.tsx` (`EstimatePDF`). They're near-duplicate files — same `StyleSheet` shape, same layout structure (header → bill-to/meta two-col → line-item table → totals → notes → footer), copy-pasted rather than shared.

**How the estimate variant is differentiated** — this is the pattern to mirror for proforma/commercial:
- A single `accent` color swapped in the color constant object: invoice uses `accent: '#6366f1'` (indigo), estimate uses `accent: '#f59e0b'` (amber) — this one value cascades into `grandVal` (total amount color) and nothing else visually distinguishes them besides copy.
- Label text swaps: `"INVOICE"` vs `"ESTIMATE"`, `"Bill To"` vs `"Prepared For"`, `"Invoice Details"` vs `"Estimate Details"`, `"Due date"` vs `"Valid until"`.
- A `STATUS_LABEL` lookup map local to each file, keyed to that document's own status enum/values.
- Estimate PDF omits the `amount_paid`/`amount_due` block entirely (estimates don't track payments) and shows `terms` in the notes block where invoices show `payment_instructions`.
- Both take `{ document, items, client, org }` props and are invoked via `renderToBuffer(createElement(Component, props))` from the calling server action (`sendEstimateEmailAction`, and equivalently in `send-invoice.ts`).

For a proforma→commercial pair, following this exact pattern means: a new `accent` color, swapped header labels, and a new `STATUS_LABEL` map — copy the file rather than adding conditionals, consistent with how estimate was done.

---

## 6. Invoice numbering

**Per-organization sequence**, not global and not per-prefix. Mechanics (`001_initial_schema.sql` + `add_peek_invoice_number.sql`):

```sql
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_org public.organizations%ROWTYPE; v_num INT;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id FOR UPDATE;  -- row lock, prevents races
  v_num := v_org.next_invoice_number;
  UPDATE public.organizations SET next_invoice_number = next_invoice_number + 1 WHERE id = p_org_id;
  RETURN v_org.invoice_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_num::TEXT, 4, '0');
END; $$;
```
- One counter column, `organizations.next_invoice_number`, shared by the *entire org* regardless of client, currency, or (currently) document subtype.
- `FOR UPDATE` row-lock serializes concurrent calls within one org — safe for concurrent invoice creation.
- **The counter does not reset per calendar year** despite `YYYY` appearing in the formatted string — it's a monotonically increasing integer forever. So numbers only look year-scoped; e.g. the last invoice of 2026 and the first of 2027 will have consecutive `NNNN` values even though the year segment changes. Worth knowing before adding a proforma sequence, since you'll likely want the same non-resetting behavior (or explicitly decide to diverge from it).
- `peek_invoice_number(p_org_id)` — read-only twin used by the new-invoice form to preview the next number without incrementing; actual increment only happens via `next_invoice_number` at save time.
- Estimates have an **entirely separate counter** (`organizations.next_estimate_number`) and their own `next_estimate_number`/`peek_estimate_number` functions, same pattern, prefix hardcoded to `'EST-'` (not configurable via `estimate_prefix`, unlike invoices' configurable `invoice_prefix`).
- `organizations.invoice_number_format` (`'{PREFIX}-{YEAR}-{NUM:04d}'`) is stored in the schema but **not actually read or parsed anywhere** — the format is hardcoded directly in the SQL function body above. Changing that column currently does nothing.

**Implication for proforma numbers:** if proforma should have its own sequence (likely, since a proforma isn't a real invoice yet), the cleanest mirror is a third counter column (`next_proforma_number`) + a third pair of SQL functions, following the estimate pattern exactly rather than reusing `next_invoice_number`.

---

## 7. RLS policies

All from `001_initial_schema.sql`, using a shared helper:
```sql
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;
```

**`organizations`** — two separate policies, no blanket `ALL`:
```sql
CREATE POLICY "users_select_own_org" ON organizations FOR SELECT TO authenticated
  USING (id = get_user_org_id());
CREATE POLICY "owners_update_own_org" ON organizations FOR UPDATE TO authenticated
  USING (id = get_user_org_id()) WITH CHECK (id = get_user_org_id());
```
No INSERT/DELETE policy on `organizations` at all (org creation happens via a service-role path, presumably the onboarding flow using an elevated key). Note the policy name says "owners" but there's no actual role check in the `USING`/`WITH CHECK` clause — any authenticated member of the org can update it, not just `owner` role.

**`invoices`** — single blanket policy:
```sql
CREATE POLICY "invoices_org_isolation" ON invoices FOR ALL TO authenticated
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());
```
Same `_org_isolation` pattern applies to `invoice_items`, `clients`, `payments`. Estimates (from `add_estimates.sql`) use the identical pattern (`estimates_org_policy`, `estimate_items_org_policy`) but only specify `USING`, no `WITH CHECK` — meaning an update could theoretically move an estimate's `organization_id` to a different org without being blocked on write, unlike invoices which check both. Minor inconsistency worth being aware of if trading-specific tables follow the estimates file as a template rather than the initial schema.

**Answering the specific question:** new trading fields added as columns on `invoices` (Incoterms, HS codes, PO reference) need **no new policy** — they inherit `invoices_org_isolation` automatically since RLS is table-level, not column-level. A new child table (e.g. `invoice_trading_details` or per-line HS codes) would need its own `organization_id` column + a copy of the same `_org_isolation` policy — that's the only place new policy work is required, and it's boilerplate, not new logic.
