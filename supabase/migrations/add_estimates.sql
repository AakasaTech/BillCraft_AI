-- Add estimate number counter to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS next_estimate_number INT NOT NULL DEFAULT 1;

-- Estimates table
CREATE TABLE IF NOT EXISTS public.estimates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  estimate_number      TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','viewed','accepted','declined','expired')),
  issue_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date          DATE,
  currency             TEXT NOT NULL DEFAULT 'USD',
  subtotal             NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_type             TEXT NOT NULL DEFAULT 'none'
                         CHECK (tax_type IN ('vat','gst','sales_tax','none')),
  tax_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  terms                TEXT,
  sent_at              TIMESTAMPTZ,
  viewed_at            TIMESTAMPTZ,
  responded_at         TIMESTAMPTZ,
  response_note        TEXT,
  share_token          UUID UNIQUE DEFAULT gen_random_uuid(),
  converted_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

-- Estimate line items
CREATE TABLE IF NOT EXISTS public.estimate_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id      UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order       INT  NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimates_org
  ON public.estimates (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_estimates_client
  ON public.estimates (client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_estimates_share_token
  ON public.estimates (share_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate
  ON public.estimate_items (estimate_id);

-- RLS
ALTER TABLE public.estimates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimates_org_policy      ON public.estimates;
DROP POLICY IF EXISTS estimate_items_org_policy ON public.estimate_items;

CREATE POLICY estimates_org_policy ON public.estimates
  USING (organization_id = get_user_org_id());

CREATE POLICY estimate_items_org_policy ON public.estimate_items
  USING (organization_id = get_user_org_id());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_estimates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_estimates_updated_at ON public.estimates;
CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION update_estimates_updated_at();

-- Atomic next estimate number (increments counter, returns formatted string)
CREATE OR REPLACE FUNCTION next_estimate_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_next INT;
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
BEGIN
  UPDATE public.organizations
     SET next_estimate_number = next_estimate_number + 1
   WHERE id = p_org_id
  RETURNING next_estimate_number - 1 INTO v_next;
  RETURN 'EST-' || v_year || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

-- Peek without incrementing
CREATE OR REPLACE FUNCTION peek_estimate_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_next INT;
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
BEGIN
  SELECT next_estimate_number INTO v_next FROM public.organizations WHERE id = p_org_id;
  RETURN 'EST-' || v_year || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;
