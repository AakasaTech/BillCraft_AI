-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Backfill any existing rows with NULL (safety net)
UPDATE public.clients
  SET portal_token = gen_random_uuid()
  WHERE portal_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_portal_token
  ON public.clients (portal_token)
  WHERE deleted_at IS NULL;
