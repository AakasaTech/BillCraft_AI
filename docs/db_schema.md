# BillCraft AI — PostgreSQL Database Schema

## 1. ER Diagram

```mermaid
erDiagram
    ORGANIZATIONS {
        uuid id PK
        varchar name
        varchar slug
        char default_currency
        varchar timezone
        varchar locale
        varchar tax_registration_number
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    USERS {
        uuid id PK
        uuid organization_id FK
        varchar email
        varchar name
        varchar role
        varchar auth_provider
        varchar auth_provider_id
        varchar avatar_url
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    CLIENTS {
        uuid id PK
        uuid organization_id FK
        uuid created_by FK
        varchar name
        varchar email
        varchar phone
        varchar address_line1
        varchar address_line2
        varchar city
        varchar state
        varchar postal_code
        char country_code
        char preferred_currency
        varchar preferred_language
        varchar tax_registration_number
        text notes
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    INVOICES {
        uuid id PK
        uuid organization_id FK
        uuid client_id FK
        uuid created_by FK
        varchar invoice_number
        varchar status
        date issue_date
        date due_date
        char currency
        numeric exchange_rate
        numeric subtotal
        numeric tax_amount
        numeric discount_amount
        numeric total
        varchar tax_type
        numeric tax_rate
        varchar tax_registration_number
        text payment_instructions
        varchar locale
        text notes
        text terms
        timestamptz sent_at
        timestamptz paid_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        uuid organization_id FK
        text description
        numeric quantity
        numeric unit_price
        numeric tax_rate
        numeric tax_amount
        numeric subtotal
        numeric total
        int sort_order
        timestamptz created_at
        timestamptz updated_at
    }

    INVOICE_SEQUENCES {
        uuid organization_id PK FK
        varchar prefix
        varchar format
        int current_number
    }

    PAYMENTS {
        uuid id PK
        uuid organization_id FK
        uuid invoice_id FK
        uuid client_id FK
        uuid created_by FK
        numeric amount
        char currency
        numeric exchange_rate
        varchar payment_method
        date payment_date
        varchar reference
        text notes
        varchar status
        varchar gateway
        varchar gateway_transaction_id
        timestamptz created_at
        timestamptz updated_at
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid organization_id FK
        varchar plan_name
        varchar status
        timestamptz current_period_start
        timestamptz current_period_end
        timestamptz trial_end
        varchar billing_cycle
        numeric amount
        char currency
        varchar gateway
        varchar gateway_subscription_id
        varchar gateway_customer_id
        bool cancel_at_period_end
        timestamptz cancelled_at
        timestamptz created_at
        timestamptz updated_at
    }

    EMAIL_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid invoice_id FK
        uuid client_id FK
        uuid user_id FK
        varchar to_email
        jsonb cc_emails
        varchar subject
        text body
        varchar status
        varchar provider
        varchar provider_message_id
        timestamptz sent_at
        text error_message
        timestamptz created_at
    }

    AI_REQUESTS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar feature
        varchar model
        int prompt_tokens
        int completion_tokens
        int total_tokens
        numeric cost
        jsonb request_payload
        jsonb response_payload
        varchar status
        int duration_ms
        text error_message
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar entity_type
        uuid entity_id
        varchar action
        jsonb old_values
        jsonb new_values
        inet ip_address
        text user_agent
        timestamptz created_at
    }

    ORGANIZATIONS ||--o{ USERS : "has"
    ORGANIZATIONS ||--o{ CLIENTS : "has"
    ORGANIZATIONS ||--o{ INVOICES : "creates"
    ORGANIZATIONS ||--o{ PAYMENTS : "receives"
    ORGANIZATIONS ||--o{ SUBSCRIPTIONS : "has"
    ORGANIZATIONS ||--o{ EMAIL_LOGS : "generates"
    ORGANIZATIONS ||--o{ AI_REQUESTS : "makes"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "has"
    ORGANIZATIONS ||--|| INVOICE_SEQUENCES : "owns"
    CLIENTS ||--o{ INVOICES : "receives"
    CLIENTS ||--o{ PAYMENTS : "makes"
    CLIENTS ||--o{ EMAIL_LOGS : "receives"
    INVOICES ||--o{ INVOICE_ITEMS : "contains"
    INVOICES ||--o{ PAYMENTS : "receives"
    INVOICES ||--o{ EMAIL_LOGS : "triggers"
    USERS ||--o{ INVOICES : "creates"
    USERS ||--o{ PAYMENTS : "records"
    USERS ||--o{ AI_REQUESTS : "makes"
    USERS ||--o{ AUDIT_LOGS : "generates"
    USERS ||--o{ EMAIL_LOGS : "sends"
```

---

## 2. SQL CREATE TABLE Statements

```sql
-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy name/email search

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'microsoft');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void');
CREATE TYPE tax_type AS ENUM ('vat', 'gst', 'sales_tax', 'none');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'card', 'cash', 'check', 'paypal', 'crypto', 'other');
CREATE TYPE payment_gateway AS ENUM ('stripe', 'paypal', 'razorpay', 'manual');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'unpaid');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
CREATE TYPE email_status AS ENUM ('queued', 'sent', 'failed', 'bounced', 'opened', 'clicked');
CREATE TYPE ai_feature AS ENUM ('invoice_generation', 'email_draft', 'data_extraction', 'line_item_suggestion', 'payment_reminder', 'analytics_summary');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'restore', 'send', 'pay', 'void', 'cancel', 'login', 'logout');

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE organizations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    slug                    VARCHAR(100) NOT NULL UNIQUE,
    default_currency        CHAR(3)      NOT NULL DEFAULT 'USD',
    timezone                VARCHAR(100) NOT NULL DEFAULT 'UTC',
    locale                  VARCHAR(10)  NOT NULL DEFAULT 'en-US',
    tax_registration_number VARCHAR(100),
    logo_url                TEXT,
    address_line1           VARCHAR(255),
    address_line2           VARCHAR(255),
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    postal_code             VARCHAR(20),
    country_code            CHAR(2),
    website                 VARCHAR(255),
    invoice_prefix          VARCHAR(20)  NOT NULL DEFAULT 'INV',
    invoice_number_format   VARCHAR(50)  NOT NULL DEFAULT '{PREFIX}-{YEAR}-{NUM:04d}',
    next_invoice_number     INT          NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email               VARCHAR(320) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    role                user_role    NOT NULL DEFAULT 'member',
    auth_provider       auth_provider NOT NULL DEFAULT 'email',
    auth_provider_id    VARCHAR(255),
    password_hash       TEXT,
    avatar_url          TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE (organization_id, email)
);

-- ============================================================
-- clients
-- ============================================================
CREATE TABLE clients (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by              UUID         REFERENCES users(id) ON DELETE SET NULL,
    name                    VARCHAR(255) NOT NULL,
    email                   VARCHAR(320),
    phone                   VARCHAR(50),
    address_line1           VARCHAR(255),
    address_line2           VARCHAR(255),
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    postal_code             VARCHAR(20),
    country_code            CHAR(2),
    preferred_currency      CHAR(3),
    preferred_language      VARCHAR(10),
    tax_registration_number VARCHAR(100),
    notes                   TEXT,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE invoices (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id               UUID           NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    created_by              UUID           REFERENCES users(id) ON DELETE SET NULL,
    invoice_number          VARCHAR(100)   NOT NULL,
    status                  invoice_status NOT NULL DEFAULT 'draft',
    issue_date              DATE           NOT NULL DEFAULT CURRENT_DATE,
    due_date                DATE,
    currency                CHAR(3)        NOT NULL,
    -- exchange rate from invoice currency to org default_currency at time of issue
    exchange_rate           NUMERIC(18, 8) NOT NULL DEFAULT 1,
    subtotal                NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount         NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_amount              NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total                   NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_paid             NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_due              NUMERIC(15, 2) GENERATED ALWAYS AS (total - amount_paid) STORED,
    tax_type                tax_type       NOT NULL DEFAULT 'none',
    tax_rate                NUMERIC(7, 4)  NOT NULL DEFAULT 0,
    tax_registration_number VARCHAR(100),
    payment_instructions    TEXT,
    locale                  VARCHAR(10),
    notes                   TEXT,
    terms                   TEXT,
    sent_at                 TIMESTAMPTZ,
    viewed_at               TIMESTAMPTZ,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ,
    UNIQUE (organization_id, invoice_number)
);

-- ============================================================
-- invoice_items
-- ============================================================
CREATE TABLE invoice_items (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    description     TEXT           NOT NULL,
    quantity        NUMERIC(15, 4) NOT NULL DEFAULT 1,
    unit_price      NUMERIC(15, 4) NOT NULL DEFAULT 0,
    -- item-level tax override; NULL means inherit from invoice
    tax_rate        NUMERIC(7, 4),
    tax_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal        NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total           NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sort_order      INT            NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ============================================================
-- payments
-- ============================================================
CREATE TABLE payments (
    id                      UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id              UUID             NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    client_id               UUID             NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    created_by              UUID             REFERENCES users(id) ON DELETE SET NULL,
    amount                  NUMERIC(15, 2)   NOT NULL,
    currency                CHAR(3)          NOT NULL,
    exchange_rate           NUMERIC(18, 8)   NOT NULL DEFAULT 1,
    payment_method          payment_method   NOT NULL DEFAULT 'bank_transfer',
    payment_date            DATE             NOT NULL DEFAULT CURRENT_DATE,
    reference               VARCHAR(255),
    notes                   TEXT,
    status                  payment_status   NOT NULL DEFAULT 'completed',
    gateway                 payment_gateway  NOT NULL DEFAULT 'manual',
    gateway_transaction_id  VARCHAR(255),
    created_at              TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ============================================================
-- subscriptions
-- ============================================================
CREATE TABLE subscriptions (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID                NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_name               VARCHAR(100)        NOT NULL,
    status                  subscription_status NOT NULL DEFAULT 'trialing',
    current_period_start    TIMESTAMPTZ         NOT NULL,
    current_period_end      TIMESTAMPTZ         NOT NULL,
    trial_end               TIMESTAMPTZ,
    billing_cycle           billing_cycle       NOT NULL DEFAULT 'monthly',
    amount                  NUMERIC(10, 2)      NOT NULL,
    currency                CHAR(3)             NOT NULL DEFAULT 'USD',
    gateway                 payment_gateway     NOT NULL DEFAULT 'stripe',
    gateway_subscription_id VARCHAR(255)        UNIQUE,
    gateway_customer_id     VARCHAR(255),
    cancel_at_period_end    BOOLEAN             NOT NULL DEFAULT FALSE,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- ============================================================
-- email_logs
-- ============================================================
CREATE TABLE email_logs (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id          UUID         REFERENCES invoices(id) ON DELETE SET NULL,
    client_id           UUID         REFERENCES clients(id) ON DELETE SET NULL,
    user_id             UUID         REFERENCES users(id) ON DELETE SET NULL,
    to_email            VARCHAR(320) NOT NULL,
    cc_emails           JSONB        NOT NULL DEFAULT '[]',
    subject             VARCHAR(500) NOT NULL,
    body                TEXT         NOT NULL,
    status              email_status NOT NULL DEFAULT 'queued',
    provider            VARCHAR(50),
    provider_message_id VARCHAR(255),
    sent_at             TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- ai_requests
-- ============================================================
CREATE TABLE ai_requests (
    id                UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID       NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id           UUID       REFERENCES users(id) ON DELETE SET NULL,
    feature           ai_feature NOT NULL,
    model             VARCHAR(100) NOT NULL,
    prompt_tokens     INT        NOT NULL DEFAULT 0,
    completion_tokens INT        NOT NULL DEFAULT 0,
    total_tokens      INT        GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
    cost              NUMERIC(12, 8) NOT NULL DEFAULT 0,
    -- store only sanitized metadata, not raw PII payloads in production
    request_payload   JSONB,
    response_payload  JSONB,
    status            VARCHAR(20) NOT NULL DEFAULT 'success',
    duration_ms       INT,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- audit_logs  (append-only — no updates or deletes)
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       UUID         NOT NULL,
    action          audit_action NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Prevent mutation of audit_logs after insert
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## 3. Indexes

```sql
-- ============================================================
-- organizations
-- ============================================================
CREATE INDEX idx_organizations_slug        ON organizations (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_deleted_at  ON organizations (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- users
-- ============================================================
CREATE INDEX idx_users_organization_id     ON users (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email               ON users (email);           -- cross-org lookups (auth)
CREATE INDEX idx_users_auth_provider       ON users (auth_provider, auth_provider_id);
CREATE INDEX idx_users_deleted_at          ON users (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- clients
-- ============================================================
CREATE INDEX idx_clients_organization_id   ON clients (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_email             ON clients (organization_id, email) WHERE deleted_at IS NULL;
-- trigram index for fuzzy name/email search
CREATE INDEX idx_clients_name_trgm         ON clients USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_country_code      ON clients (organization_id, country_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_deleted_at        ON clients (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- invoices
-- ============================================================
CREATE INDEX idx_invoices_organization_id  ON invoices (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_client_id        ON invoices (client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status           ON invoices (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due_date         ON invoices (organization_id, due_date) WHERE deleted_at IS NULL AND status NOT IN ('paid', 'void', 'cancelled');
CREATE INDEX idx_invoices_issue_date       ON invoices (organization_id, issue_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_number           ON invoices (organization_id, invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_currency         ON invoices (organization_id, currency) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_deleted_at       ON invoices (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- invoice_items
-- ============================================================
CREATE INDEX idx_invoice_items_invoice_id  ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_org_id      ON invoice_items (organization_id);

-- ============================================================
-- payments
-- ============================================================
CREATE INDEX idx_payments_organization_id  ON payments (organization_id);
CREATE INDEX idx_payments_invoice_id       ON payments (invoice_id);
CREATE INDEX idx_payments_client_id        ON payments (client_id);
CREATE INDEX idx_payments_payment_date     ON payments (organization_id, payment_date);
CREATE INDEX idx_payments_gateway_tx       ON payments (gateway, gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;

-- ============================================================
-- subscriptions
-- ============================================================
CREATE INDEX idx_subscriptions_org_id      ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_status      ON subscriptions (status);
CREATE INDEX idx_subscriptions_period_end  ON subscriptions (current_period_end) WHERE status = 'active';

-- ============================================================
-- email_logs
-- ============================================================
CREATE INDEX idx_email_logs_org_id         ON email_logs (organization_id);
CREATE INDEX idx_email_logs_invoice_id     ON email_logs (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_email_logs_client_id      ON email_logs (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_email_logs_status         ON email_logs (status);
CREATE INDEX idx_email_logs_created_at     ON email_logs (organization_id, created_at);

-- ============================================================
-- ai_requests
-- ============================================================
CREATE INDEX idx_ai_requests_org_id        ON ai_requests (organization_id);
CREATE INDEX idx_ai_requests_user_id       ON ai_requests (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ai_requests_feature       ON ai_requests (organization_id, feature);
CREATE INDEX idx_ai_requests_created_at    ON ai_requests (organization_id, created_at);

-- ============================================================
-- audit_logs
-- ============================================================
CREATE INDEX idx_audit_logs_org_id         ON audit_logs (organization_id);
CREATE INDEX idx_audit_logs_entity         ON audit_logs (organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id        ON audit_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at     ON audit_logs (organization_id, created_at);
```

---

## 4. Updated_at Trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply to every table that has updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['organizations','users','clients','invoices','invoice_items','payments','subscriptions']
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;
```

---

## 5. Invoice Numbering

```sql
-- Generates the next invoice number for an org, e.g. INV-2026-0042
-- Called inside a transaction so the increment is atomic.
CREATE OR REPLACE FUNCTION next_invoice_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_org     organizations%ROWTYPE;
    v_num     INT;
    v_result  TEXT;
BEGIN
    SELECT * INTO v_org
    FROM organizations
    WHERE id = p_org_id
    FOR UPDATE;          -- row lock prevents duplicate numbers under concurrency

    v_num := v_org.next_invoice_number;

    -- Simple format: PREFIX-YEAR-NNNN
    v_result := v_org.invoice_prefix
                || '-' || to_char(now(), 'YYYY')
                || '-' || lpad(v_num::TEXT, 4, '0');

    UPDATE organizations
    SET next_invoice_number = next_invoice_number + 1
    WHERE id = p_org_id;

    RETURN v_result;
END;
$$;
```

---

## 6. Row-Level Security

```sql
-- ============================================================
-- Enable RLS on all multi-tenant tables
-- ============================================================
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Application roles
-- ============================================================
-- app_user  : the role the API server connects as
-- app_admin : used for migrations and back-office operations
CREATE ROLE app_user  NOLOGIN;
CREATE ROLE app_admin NOLOGIN BYPASSRLS;

-- ============================================================
-- Helper: current org from session variable
-- Set via:  SELECT set_config('app.current_org_id', $orgId, true);
-- ============================================================
CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID
LANGUAGE sql STABLE AS $$
    SELECT current_setting('app.current_org_id', true)::UUID;
$$;

-- ============================================================
-- RLS Policies — organizations
-- ============================================================
CREATE POLICY org_isolation ON organizations
    FOR ALL TO app_user
    USING (id = current_org_id() AND deleted_at IS NULL);

-- ============================================================
-- RLS Policies — users
-- ============================================================
CREATE POLICY user_org_isolation ON users
    FOR ALL TO app_user
    USING (organization_id = current_org_id() AND deleted_at IS NULL);

-- ============================================================
-- RLS Policies — clients
-- ============================================================
CREATE POLICY client_org_isolation ON clients
    FOR ALL TO app_user
    USING (organization_id = current_org_id() AND deleted_at IS NULL);

-- ============================================================
-- RLS Policies — invoices
-- ============================================================
CREATE POLICY invoice_org_isolation ON invoices
    FOR ALL TO app_user
    USING (organization_id = current_org_id() AND deleted_at IS NULL);

-- ============================================================
-- RLS Policies — invoice_items
-- ============================================================
CREATE POLICY invoice_item_org_isolation ON invoice_items
    FOR ALL TO app_user
    USING (organization_id = current_org_id());

-- ============================================================
-- RLS Policies — payments
-- ============================================================
CREATE POLICY payment_org_isolation ON payments
    FOR ALL TO app_user
    USING (organization_id = current_org_id());

-- ============================================================
-- RLS Policies — subscriptions
-- ============================================================
CREATE POLICY subscription_org_isolation ON subscriptions
    FOR ALL TO app_user
    USING (organization_id = current_org_id());

-- ============================================================
-- RLS Policies — email_logs
-- ============================================================
CREATE POLICY email_log_org_isolation ON email_logs
    FOR ALL TO app_user
    USING (organization_id = current_org_id());

-- ============================================================
-- RLS Policies — ai_requests
-- ============================================================
CREATE POLICY ai_request_org_isolation ON ai_requests
    FOR ALL TO app_user
    USING (organization_id = current_org_id());

-- ============================================================
-- RLS Policies — audit_logs (read-only for app_user)
-- ============================================================
CREATE POLICY audit_log_org_read ON audit_logs
    FOR SELECT TO app_user
    USING (organization_id = current_org_id());

-- Only a trusted backend role can insert audit logs
CREATE POLICY audit_log_insert ON audit_logs
    FOR INSERT TO app_user
    WITH CHECK (organization_id = current_org_id());

-- ============================================================
-- Grant table-level permissions to app_user
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
    organizations, users, clients, invoices, invoice_items,
    payments, subscriptions, email_logs, ai_requests
TO app_user;

GRANT SELECT, INSERT ON audit_logs TO app_user;
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO app_user;
```

---

## 7. Example Queries

### 7a. Dashboard: Outstanding AR per org
```sql
-- Set session context first in application layer:
-- SELECT set_config('app.current_org_id', $1, true);

SELECT
    c.name                      AS client_name,
    COUNT(i.id)                 AS open_invoices,
    SUM(i.amount_due)           AS total_due,
    i.currency,
    MIN(i.due_date)             AS earliest_due
FROM invoices i
JOIN clients c ON c.id = i.client_id
WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue')
GROUP BY c.name, i.currency
ORDER BY total_due DESC;
```

### 7b. Mark overdue invoices (scheduled job)
```sql
UPDATE invoices
SET status = 'overdue', updated_at = now()
WHERE status IN ('sent', 'viewed', 'partial')
  AND due_date < CURRENT_DATE
  AND deleted_at IS NULL;
```

### 7c. Record a payment and update invoice
```sql
BEGIN;

INSERT INTO payments (
    organization_id, invoice_id, client_id, created_by,
    amount, currency, exchange_rate, payment_method, payment_date, reference
) VALUES (
    $org_id, $invoice_id, $client_id, $user_id,
    $amount, $currency, $exchange_rate, 'bank_transfer', $payment_date, $reference
);

UPDATE invoices
SET
    amount_paid = amount_paid + $amount_in_invoice_currency,
    status = CASE
        WHEN amount_paid + $amount_in_invoice_currency >= total THEN 'paid'
        ELSE 'partial'
    END,
    paid_at = CASE
        WHEN amount_paid + $amount_in_invoice_currency >= total THEN now()
        ELSE paid_at
    END
WHERE id = $invoice_id;

INSERT INTO audit_logs (organization_id, user_id, entity_type, entity_id, action, new_values)
VALUES ($org_id, $user_id, 'payment', $payment_id, 'create',
        jsonb_build_object('amount', $amount, 'currency', $currency));

COMMIT;
```

### 7d. Monthly revenue report (multi-currency, converted to org default)
```sql
SELECT
    date_trunc('month', payment_date)   AS month,
    SUM(amount * exchange_rate)         AS revenue_in_base_currency,
    COUNT(*)                            AS payment_count
FROM payments
WHERE status = 'completed'
  AND payment_date >= date_trunc('year', now())
GROUP BY 1
ORDER BY 1;
```

### 7e. AI token usage and cost by feature (last 30 days)
```sql
SELECT
    feature,
    COUNT(*)                        AS requests,
    SUM(total_tokens)               AS tokens_used,
    SUM(cost)                       AS total_cost,
    AVG(duration_ms)                AS avg_latency_ms,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS success_rate
FROM ai_requests
WHERE created_at >= now() - INTERVAL '30 days'
GROUP BY feature
ORDER BY total_cost DESC;
```

### 7f. Audit trail for a specific invoice
```sql
SELECT
    al.created_at,
    u.name              AS performed_by,
    al.action,
    al.old_values,
    al.new_values,
    al.ip_address
FROM audit_logs al
LEFT JOIN users u ON u.id = al.user_id
WHERE al.entity_type = 'invoice'
  AND al.entity_id   = $invoice_id
ORDER BY al.created_at;
```

### 7g. Clients with no invoices in the last 90 days (churn risk)
```sql
SELECT
    c.id, c.name, c.email,
    MAX(i.issue_date) AS last_invoice_date
FROM clients c
LEFT JOIN invoices i
    ON i.client_id = c.id
   AND i.deleted_at IS NULL
   AND i.status NOT IN ('void', 'cancelled')
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.email
HAVING MAX(i.issue_date) < now() - INTERVAL '90 days'
    OR MAX(i.issue_date) IS NULL
ORDER BY last_invoice_date NULLS FIRST;
```

---

## 8. Migration Strategy

### Tools
Use **Flyway** or **Liquibase** for versioned migrations. Each migration file is named `V{version}__{description}.sql` and committed alongside the application code.

### Directory layout
```
migrations/
  V001__create_extensions_and_enums.sql
  V002__create_organizations.sql
  V003__create_users.sql
  V004__create_clients.sql
  V005__create_invoices.sql
  V006__create_invoice_items.sql
  V007__create_payments.sql
  V008__create_subscriptions.sql
  V009__create_email_logs.sql
  V010__create_ai_requests.sql
  V011__create_audit_logs.sql
  V012__create_indexes.sql
  V013__create_functions_and_triggers.sql
  V014__enable_rls_and_policies.sql
  V015__seed_roles_and_grants.sql
```

### Phase plan

| Phase | Scope | Notes |
|-------|-------|-------|
| **V001–V011** | Schema creation | Run in a single transaction per file; zero data yet |
| **V012** | Indexes | `CREATE INDEX CONCURRENTLY` if running against existing data — must run outside a transaction |
| **V013** | Functions & triggers | Idempotent using `CREATE OR REPLACE` |
| **V014** | RLS policies | After app_user role exists |
| **V015** | Grants | Final step; confirms least-privilege access |

### Safe rollout checklist
- [ ] Run migrations on a staging clone first
- [ ] All `CREATE INDEX CONCURRENTLY` statements are outside explicit transactions
- [ ] `ALTER TABLE ... ADD COLUMN` with a non-volatile default (PostgreSQL 11+) does not rewrite the table
- [ ] Never `DROP COLUMN` immediately — soft-deprecate first, remove in a later release after confirming no app references
- [ ] Soft deletes mean no `DELETE` migrations on business data; only schema objects are dropped
- [ ] Back up the database before each major migration batch in production

### Application-side session setup (connection pool middleware)
```sql
-- Execute at the start of every database transaction
SELECT set_config('app.current_org_id', $1::TEXT, true);
-- true = local to transaction only (safer than session-level)
```

> **Security note:** Never allow user input to flow directly into `set_config`. The org ID must be resolved from a verified JWT/session before being passed to the database.
