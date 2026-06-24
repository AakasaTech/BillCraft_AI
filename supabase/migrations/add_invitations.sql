-- Run in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.invitations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  role            user_role   NOT NULL DEFAULT 'member',
  token           UUID        UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  invited_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Fast lookup by token (accept flow — no auth context)
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON public.invitations (token)
  WHERE deleted_at IS NULL AND accepted_at IS NULL;

-- Org-scoped listing
CREATE INDEX IF NOT EXISTS idx_invitations_org
  ON public.invitations (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Members can see pending invitations for their own org
CREATE POLICY "invitations_select_own_org"
  ON public.invitations FOR SELECT
  USING (organization_id = get_user_org_id());

-- Owner/admin can create invitations
CREATE POLICY "invitations_insert_owner_admin"
  ON public.invitations FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owner/admin can revoke (soft-delete)
CREATE POLICY "invitations_update_owner_admin"
  ON public.invitations FOR UPDATE
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
