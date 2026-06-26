-- ============================================================
-- BillCraft AI — Initial Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE user_role           AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE auth_provider_type  AS ENUM ('email', 'google', 'microsoft');
CREATE TYPE invoice_status      AS ENUM ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void');
CREATE TYPE tax_type            AS ENUM ('vat', 'gst', 'sales_tax', 'none');
CREATE TYPE payment_status_type AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method_type AS ENUM ('bank_transfer', 'card', 'cash', 'check', 'paypal', 'crypto', 'other');
CREATE TYPE payment_gateway     AS ENUM ('stripe', 'paypal', 'razorpay', 'manual');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'unpaid');
CREATE TYPE billing_cycle       AS ENUM ('monthly', 'annual');
CREATE TYPE email_status        AS ENUM ('queued', 'sent', 'failed', 'bounced', 'opened', 'clicked');
CREATE TYPE ai_feature          AS ENUM ('invoice_generation', 'email_draft', 'data_extraction', 'line_item_suggestion', 'payment_reminder', 'analytics_summary');
CREATE TYPE audit_action        AS ENUM ('create', 'update', 'delete', 'restore', 'send', 'pay', 'void', 'cancel', 'login', 'logout');

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE public.organizations (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
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
    freepass_plan           VARCHAR(50),
    freepass_until          TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- ============================================================
-- users (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
    id              UUID               PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID               REFERENCES public.organizations(id) ON DELETE CASCADE,
    email           VARCHAR(320)       NOT NULL,
    name            VARCHAR(255)       NOT NULL DEFAULT '',
    role            user_role          NOT NULL DEFAULT 'owner',
    auth_provider   auth_provider_type NOT NULL DEFAULT 'email',
    avatar_url      TEXT,
    is_active       BOOLEAN            NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- clients
-- ============================================================
CREATE TABLE public.clients (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by              UUID         REFERENCES public.users(id) ON DELETE SET NULL,
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
    cc_emails               JSONB        NOT NULL DEFAULT '[]',
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE public.invoices (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id               UUID           NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    created_by              UUID           REFERENCES public.users(id) ON DELETE SET NULL,
    invoice_number          VARCHAR(100)   NOT NULL,
    status                  invoice_status NOT NULL DEFAULT 'draft',
    issue_date              DATE           NOT NULL DEFAULT CURRENT_DATE,
    due_date                DATE,
    currency                CHAR(3)        NOT NULL DEFAULT 'USD',
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
CREATE TABLE public.invoice_items (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID           NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    organization_id UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    description     TEXT           NOT NULL,
    quantity        NUMERIC(15, 4) NOT NULL DEFAULT 1,
    unit_price      NUMERIC(15, 4) NOT NULL DEFAULT 0,
    tax_rate        NUMERIC(7, 4),              -- NULL = inherit from invoice
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
CREATE TABLE public.payments (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID                NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_id              UUID                NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    client_id               UUID                NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    created_by              UUID                REFERENCES public.users(id) ON DELETE SET NULL,
    amount                  NUMERIC(15, 2)      NOT NULL,
    currency                CHAR(3)             NOT NULL,
    exchange_rate           NUMERIC(18, 8)      NOT NULL DEFAULT 1,
    payment_method          payment_method_type NOT NULL DEFAULT 'bank_transfer',
    payment_date            DATE                NOT NULL DEFAULT CURRENT_DATE,
    reference               VARCHAR(255),
    notes                   TEXT,
    status                  payment_status_type NOT NULL DEFAULT 'completed',
    gateway                 payment_gateway     NOT NULL DEFAULT 'manual',
    gateway_transaction_id  VARCHAR(255),
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- ============================================================
-- subscriptions
-- ============================================================
CREATE TABLE public.subscriptions (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID                NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
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
CREATE TABLE public.email_logs (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_id          UUID         REFERENCES public.invoices(id) ON DELETE SET NULL,
    client_id           UUID         REFERENCES public.clients(id) ON DELETE SET NULL,
    user_id             UUID         REFERENCES public.users(id) ON DELETE SET NULL,
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
CREATE TABLE public.ai_requests (
    id                UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID       NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id           UUID       REFERENCES public.users(id) ON DELETE SET NULL,
    feature           ai_feature NOT NULL,
    model             VARCHAR(100) NOT NULL,
    prompt_tokens     INT        NOT NULL DEFAULT 0,
    completion_tokens INT        NOT NULL DEFAULT 0,
    total_tokens      INT        GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
    cost              NUMERIC(12, 8) NOT NULL DEFAULT 0,
    request_payload   JSONB,
    response_payload  JSONB,
    status            VARCHAR(20) NOT NULL DEFAULT 'success',
    duration_ms       INT,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- audit_logs (append-only)
-- ============================================================
CREATE TABLE public.audit_logs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id         UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       UUID         NOT NULL,
    action          audit_action NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_organizations_slug        ON public.organizations (slug) WHERE deleted_at IS NULL;

CREATE INDEX idx_users_organization_id     ON public.users (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email               ON public.users (email);

CREATE INDEX idx_clients_organization_id   ON public.clients (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_name_trgm         ON public.clients USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_email             ON public.clients (organization_id, email) WHERE deleted_at IS NULL;

CREATE INDEX idx_invoices_organization_id  ON public.invoices (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_client_id        ON public.invoices (client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status           ON public.invoices (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due_date         ON public.invoices (organization_id, due_date) WHERE deleted_at IS NULL AND status NOT IN ('paid', 'void', 'cancelled');
CREATE INDEX idx_invoices_issue_date       ON public.invoices (organization_id, issue_date) WHERE deleted_at IS NULL;

CREATE INDEX idx_invoice_items_invoice_id  ON public.invoice_items (invoice_id);
CREATE INDEX idx_payments_invoice_id       ON public.payments (invoice_id);
CREATE INDEX idx_payments_gateway_tx       ON public.payments (gateway, gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX idx_subscriptions_org_id      ON public.subscriptions (organization_id);
CREATE INDEX idx_subscriptions_gateway_sub ON public.subscriptions (gateway_subscription_id) WHERE gateway_subscription_id IS NOT NULL;
CREATE INDEX idx_email_logs_invoice_id     ON public.email_logs (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_ai_requests_org_id        ON public.ai_requests (organization_id);
CREATE INDEX idx_audit_logs_entity         ON public.audit_logs (organization_id, entity_type, entity_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'organizations','users','clients','invoices',
        'invoice_items','payments','subscriptions'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- Invoice number generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_org   public.organizations%ROWTYPE;
    v_num   INT;
BEGIN
    SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id FOR UPDATE;
    v_num := v_org.next_invoice_number;
    UPDATE public.organizations SET next_invoice_number = next_invoice_number + 1 WHERE id = p_org_id;
    RETURN v_org.invoice_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_num::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- RLS helper: get current user's org
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.users
    WHERE id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs     ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY "users_select_own_org"
    ON public.organizations FOR SELECT TO authenticated
    USING (id = public.get_user_org_id());

CREATE POLICY "owners_update_own_org"
    ON public.organizations FOR UPDATE TO authenticated
    USING (id = public.get_user_org_id())
    WITH CHECK (id = public.get_user_org_id());

-- users: users can see colleagues in same org; can update own row
CREATE POLICY "users_select_org_members"
    ON public.users FOR SELECT TO authenticated
    USING (organization_id = public.get_user_org_id() OR id = auth.uid());

CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- clients
CREATE POLICY "clients_org_isolation"
    ON public.clients FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id())
    WITH CHECK (organization_id = public.get_user_org_id());

-- invoices
CREATE POLICY "invoices_org_isolation"
    ON public.invoices FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id())
    WITH CHECK (organization_id = public.get_user_org_id());

-- invoice_items
CREATE POLICY "invoice_items_org_isolation"
    ON public.invoice_items FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id())
    WITH CHECK (organization_id = public.get_user_org_id());

-- payments
CREATE POLICY "payments_org_isolation"
    ON public.payments FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id())
    WITH CHECK (organization_id = public.get_user_org_id());

-- subscriptions
CREATE POLICY "subscriptions_org_isolation"
    ON public.subscriptions FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id());

-- email_logs
CREATE POLICY "email_logs_org_isolation"
    ON public.email_logs FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id());

-- ai_requests
CREATE POLICY "ai_requests_org_isolation"
    ON public.ai_requests FOR ALL TO authenticated
    USING (organization_id = public.get_user_org_id());

-- audit_logs (read-only for authenticated)
CREATE POLICY "audit_logs_select"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "audit_logs_insert"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (organization_id = public.get_user_org_id());

-- Prevent modifications to audit trail
CREATE RULE audit_logs_no_update AS ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING;
