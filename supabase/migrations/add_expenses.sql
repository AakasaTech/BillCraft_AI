-- M25: Expense tracking

CREATE TABLE IF NOT EXISTS public.expenses (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID           REFERENCES public.users(id) ON DELETE SET NULL,
  date            DATE           NOT NULL DEFAULT CURRENT_DATE,
  category        VARCHAR(100)   NOT NULL DEFAULT 'other',
  description     VARCHAR(500)   NOT NULL,
  amount          NUMERIC(15,2)  NOT NULL CHECK (amount >= 0),
  currency        CHAR(3)        NOT NULL DEFAULT 'USD',
  vendor          VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_org_date
  ON public.expenses (organization_id, date DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (organization_id = (SELECT public.get_user_org_id()));

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE USING (organization_id = (SELECT public.get_user_org_id()));
