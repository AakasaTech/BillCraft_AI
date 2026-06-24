-- Run in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id            UUID           NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  title                VARCHAR(255)   NOT NULL DEFAULT '',
  frequency            TEXT           NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_issue_date      DATE           NOT NULL,
  due_days             INT            NOT NULL DEFAULT 30,
  currency             CHAR(3)        NOT NULL DEFAULT 'USD',
  tax_type             TEXT           NOT NULL DEFAULT 'none' CHECK (tax_type IN ('vat', 'gst', 'sales_tax', 'none')),
  tax_rate             NUMERIC(7, 4)  NOT NULL DEFAULT 0,
  discount_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes                TEXT,
  payment_instructions TEXT,
  items                JSONB          NOT NULL DEFAULT '[]',
  is_active            BOOLEAN        NOT NULL DEFAULT TRUE,
  last_issued_at       TIMESTAMPTZ,
  total_issued         INT            NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_org_id
  ON public.recurring_invoices (organization_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_issue
  ON public.recurring_invoices (next_issue_date) WHERE is_active = TRUE AND deleted_at IS NULL;

CREATE TRIGGER trg_recurring_invoices_updated_at
  BEFORE UPDATE ON public.recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_invoices_org_isolation"
  ON public.recurring_invoices FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
