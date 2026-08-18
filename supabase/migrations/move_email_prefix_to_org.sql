-- Move the billcraft.aakasa.dev sender prefix from per-user to per-org, so an
-- organization has one consistent sender identity regardless of which team
-- member sends. Previously on users.email_prefix (unique per user, platform-wide).

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS email_prefix TEXT UNIQUE;

-- Backfill: prefer the owner's prefix if set, otherwise the earliest team
-- member who had one configured.
UPDATE public.organizations o
SET email_prefix = sub.email_prefix
FROM (
  SELECT DISTINCT ON (u.organization_id)
    u.organization_id, u.email_prefix
  FROM public.users u
  WHERE u.email_prefix IS NOT NULL
  ORDER BY u.organization_id, (u.role = 'owner') DESC, u.created_at ASC
) sub
WHERE o.id = sub.organization_id;

ALTER TABLE public.users DROP COLUMN IF EXISTS email_prefix;
