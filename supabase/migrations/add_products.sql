-- Run in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_org ON public.products (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage products"
  ON public.products FOR ALL
  USING  (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());
