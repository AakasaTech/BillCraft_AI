-- Trading Company org category: proformas, client sub-units, and trading-specific
-- fields on invoices/invoice_items/estimates.

-- Org category + proforma number counter
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'service'
    CHECK (category IN ('service', 'trading'));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS next_proforma_number INT NOT NULL DEFAULT 1;

-- Proformas table (trading-category orgs)
CREATE TABLE IF NOT EXISTS public.proformas (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id              UUID           NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by             UUID           REFERENCES public.users(id) ON DELETE SET NULL,
  proforma_number        TEXT           NOT NULL,
  status                 TEXT           NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','viewed','accepted','converted','expired')),
  issue_date             DATE           NOT NULL DEFAULT CURRENT_DATE,
  expiry_date            DATE,
  currency               CHAR(3)        NOT NULL DEFAULT 'USD',
  exchange_rate          NUMERIC(18, 8) NOT NULL DEFAULT 1,
  subtotal               NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount_amount        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_amount             NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total                  NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_type               tax_type       NOT NULL DEFAULT 'none',
  tax_rate               NUMERIC(5, 2)  NOT NULL DEFAULT 0,
  shipping_terms         TEXT,
  local_transport_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes                  TEXT,
  terms                  TEXT,
  sent_at                TIMESTAMPTZ,
  viewed_at              TIMESTAMPTZ,
  responded_at           TIMESTAMPTZ,
  response_note          TEXT,
  share_token            UUID           UNIQUE DEFAULT gen_random_uuid(),
  converted_invoice_id   UUID           REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

-- Proforma line items
CREATE TABLE IF NOT EXISTS public.proforma_items (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id       UUID           NOT NULL REFERENCES public.proformas(id) ON DELETE CASCADE,
  organization_id   UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description       TEXT           NOT NULL,
  quantity          NUMERIC(15, 4) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(15, 4) NOT NULL DEFAULT 0,
  hs_code           TEXT,
  country_of_origin TEXT,
  subtotal          NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total             NUMERIC(15, 2) NOT NULL DEFAULT 0,
  sort_order        INT            NOT NULL DEFAULT 0
);

-- Client sub-units (ship-to / bill-to sub-locations for trading clients)
CREATE TABLE IF NOT EXISTS public.client_subunits (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID         NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  address_line1   VARCHAR(255),
  address_line2   VARCHAR(255),
  city            VARCHAR(100),
  state           VARCHAR(100),
  postal_code     VARCHAR(20),
  country_code    CHAR(2),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- Trading-specific invoice fields
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipping_terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS po_reference TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS local_transport_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_simplified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source_proforma_id UUID REFERENCES public.proformas(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_subunit_id UUID REFERENCES public.client_subunits(id);

-- Trading-specific invoice line item fields
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS hs_code TEXT;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS country_of_origin TEXT;

-- Estimate -> proforma linkage (trading-category orgs). Independent of the existing
-- converted_invoice_id, which service-category orgs keep using to convert estimates
-- directly to invoices.
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS converted_proforma_id UUID REFERENCES public.proformas(id) ON DELETE SET NULL;

-- Deferred FK: proformas.client_subunit_id (client_subunits didn't exist yet above)
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS client_subunit_id UUID REFERENCES public.client_subunits(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proformas_org
  ON public.proformas (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proformas_client
  ON public.proformas (client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proformas_share_token
  ON public.proformas (share_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma
  ON public.proforma_items (proforma_id);
CREATE INDEX IF NOT EXISTS idx_client_subunits_client
  ON public.client_subunits (client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_subunits_org
  ON public.client_subunits (organization_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.proformas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subunits ENABLE ROW LEVEL SECURITY;

-- Note: unlike estimates_org_policy / estimate_items_org_policy (USING only, no
-- WITH CHECK), these follow invoices_org_isolation exactly: FOR ALL + USING + WITH CHECK.
DROP POLICY IF EXISTS proformas_org_isolation ON public.proformas;
CREATE POLICY proformas_org_isolation
  ON public.proformas FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS proforma_items_org_isolation ON public.proforma_items;
CREATE POLICY proforma_items_org_isolation
  ON public.proforma_items FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS client_subunits_org_isolation ON public.client_subunits;
CREATE POLICY client_subunits_org_isolation
  ON public.client_subunits FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

-- Auto-update updated_at (reuses public.set_updated_at() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS trg_proformas_updated_at ON public.proformas;
CREATE TRIGGER trg_proformas_updated_at
  BEFORE UPDATE ON public.proformas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_client_subunits_updated_at ON public.client_subunits;
CREATE TRIGGER trg_client_subunits_updated_at
  BEFORE UPDATE ON public.client_subunits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic next proforma number (row-locked, mirrors next_invoice_number verbatim;
-- prefix hardcoded 'PRO-' the same way estimates hardcode 'EST-' rather than
-- reading a configurable *_prefix column)
CREATE OR REPLACE FUNCTION public.next_proforma_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_org public.organizations%ROWTYPE;
    v_num INT;
BEGIN
    SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id FOR UPDATE;
    v_num := v_org.next_proforma_number;
    UPDATE public.organizations SET next_proforma_number = next_proforma_number + 1 WHERE id = p_org_id;
    RETURN 'PRO-' || to_char(now(), 'YYYY') || '-' || lpad(v_num::TEXT, 4, '0');
END;
$$;

-- Peek without incrementing
CREATE OR REPLACE FUNCTION public.peek_proforma_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  RETURN 'PRO-' || to_char(now(), 'YYYY') || '-' || lpad(v_org.next_proforma_number::TEXT, 4, '0');
END;
$$;
