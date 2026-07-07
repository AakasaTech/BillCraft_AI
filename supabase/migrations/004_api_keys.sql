-- API keys for external integrations (TaskCraft, etc.)
CREATE TABLE IF NOT EXISTS api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  key_prefix      text NOT NULL,        -- first 12 chars for display, e.g. "bc_live_AbCd"
  key_hash        text NOT NULL UNIQUE, -- SHA-256 of the full key
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash);

-- RLS: only the owning org's users can see their keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys: org members can view"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "api_keys: owners and admins can insert"
  ON api_keys FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "api_keys: owners and admins can update"
  ON api_keys FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
