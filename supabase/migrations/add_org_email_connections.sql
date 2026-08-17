-- Bring-your-own email sending: each org registers their OWN OAuth app
-- (their own Google Cloud project / Azure app registration) and connects a
-- mailbox through it. BillCraft never runs its own shared/verified OAuth app
-- for this — client_id/client_secret belong to the org, not the platform.

CREATE TABLE IF NOT EXISTS public.org_email_connections (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider                 TEXT         NOT NULL CHECK (provider IN ('google', 'microsoft')),
  client_id                TEXT         NOT NULL,
  client_secret            TEXT         NOT NULL, -- encrypted (lib/crypto.ts) at rest
  tenant_id                TEXT,                  -- Microsoft only; org's Entra tenant ID, or 'common'
  connected_email          TEXT,                  -- mailbox that completed OAuth (set once connected)
  refresh_token            TEXT,                  -- encrypted at rest
  access_token             TEXT,                  -- encrypted at rest; short-lived cache
  access_token_expires_at  TIMESTAMPTZ,
  status                   TEXT         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'connected', 'error', 'revoked')),
  last_error               TEXT,
  oauth_state              TEXT,                  -- CSRF token for the in-flight authorize→callback round trip
  oauth_state_expires_at   TIMESTAMPTZ,
  connected_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  connected_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

-- Which connected provider (if any) client-facing document emails should use.
-- Null = no custom connection active, keep using the platform sender.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS active_email_provider TEXT
    CHECK (active_email_provider IN ('google', 'microsoft'));

CREATE INDEX IF NOT EXISTS idx_org_email_connections_org
  ON public.org_email_connections (organization_id);

ALTER TABLE public.org_email_connections ENABLE ROW LEVEL SECURITY;

-- Matches invoices_org_isolation exactly (FOR ALL + USING + WITH CHECK).
DROP POLICY IF EXISTS org_email_connections_org_isolation ON public.org_email_connections;
CREATE POLICY org_email_connections_org_isolation
  ON public.org_email_connections FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

DROP TRIGGER IF EXISTS trg_org_email_connections_updated_at ON public.org_email_connections;
CREATE TRIGGER trg_org_email_connections_updated_at
  BEFORE UPDATE ON public.org_email_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
