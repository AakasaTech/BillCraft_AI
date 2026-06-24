-- M34: Custom email templates per organization

CREATE TABLE IF NOT EXISTS public.email_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('invoice', 'reminder', 'estimate')),
  subject         TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, type)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage email_templates"
  ON public.email_templates
  FOR ALL
  USING  (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

CREATE INDEX IF NOT EXISTS email_templates_org_type_idx
  ON public.email_templates (organization_id, type);
