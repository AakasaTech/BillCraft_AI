-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Give all existing orgs a 2-month trial from now
UPDATE public.organizations
  SET trial_ends_at = now() + INTERVAL '2 months'
  WHERE trial_ends_at IS NULL;
