-- Admin-granted free pass columns on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS freepass_plan   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS freepass_until  TIMESTAMPTZ;
