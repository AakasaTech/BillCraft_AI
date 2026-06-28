-- Add per-user sender email prefix (xxxx@billcraft.aakasa.dev)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_prefix VARCHAR(30) UNIQUE;

-- Enforce format at DB level: lowercase letters, numbers, hyphens; min 3 chars
ALTER TABLE users
  ADD CONSTRAINT users_email_prefix_format
  CHECK (
    email_prefix IS NULL
    OR (
      length(email_prefix) >= 3
      AND email_prefix ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    )
  );
