-- M28: Invoice Templates

CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by           UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  name                 VARCHAR(255)  NOT NULL,
  currency             CHAR(3)       NOT NULL DEFAULT 'USD',
  tax_type             VARCHAR(20)   NOT NULL DEFAULT 'none',
  tax_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_days             INTEGER,
  notes                TEXT,
  payment_instructions TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.invoice_template_items (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID           NOT NULL REFERENCES public.invoice_templates(id) ON DELETE CASCADE,
  description VARCHAR(1000)  NOT NULL,
  quantity    NUMERIC(10,3)  NOT NULL DEFAULT 1,
  unit_price  NUMERIC(15,2)  NOT NULL DEFAULT 0,
  sort_order  INTEGER        NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_org
  ON public.invoice_templates (organization_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_invoice_templates_updated_at ON public.invoice_templates;
CREATE TRIGGER trg_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row-level security: invoice_templates ────────────────────────────────────

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_templates_select" ON public.invoice_templates;
CREATE POLICY "invoice_templates_select" ON public.invoice_templates
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "invoice_templates_insert" ON public.invoice_templates;
CREATE POLICY "invoice_templates_insert" ON public.invoice_templates
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "invoice_templates_update" ON public.invoice_templates;
CREATE POLICY "invoice_templates_update" ON public.invoice_templates
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "invoice_templates_delete" ON public.invoice_templates;
CREATE POLICY "invoice_templates_delete" ON public.invoice_templates
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));

-- ── Row-level security: invoice_template_items ───────────────────────────────

ALTER TABLE public.invoice_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_template_items_select" ON public.invoice_template_items;
CREATE POLICY "invoice_template_items_select" ON public.invoice_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoice_templates t
      WHERE t.id = template_id
        AND t.organization_id = (SELECT public.get_user_org_id())
        AND t.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "invoice_template_items_insert" ON public.invoice_template_items;
CREATE POLICY "invoice_template_items_insert" ON public.invoice_template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice_templates t
      WHERE t.id = template_id
        AND t.organization_id = (SELECT public.get_user_org_id())
        AND t.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "invoice_template_items_update" ON public.invoice_template_items;
CREATE POLICY "invoice_template_items_update" ON public.invoice_template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoice_templates t
      WHERE t.id = template_id
        AND t.organization_id = (SELECT public.get_user_org_id())
        AND t.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "invoice_template_items_delete" ON public.invoice_template_items;
CREATE POLICY "invoice_template_items_delete" ON public.invoice_template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoice_templates t
      WHERE t.id = template_id
        AND t.organization_id = (SELECT public.get_user_org_id())
        AND t.deleted_at IS NULL
    )
  );
