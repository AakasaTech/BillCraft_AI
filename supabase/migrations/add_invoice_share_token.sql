-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Backfill any rows that somehow have NULL (shouldn't happen with DEFAULT, but safe)
UPDATE public.invoices
  SET share_token = gen_random_uuid()
  WHERE share_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_share_token
  ON public.invoices (share_token)
  WHERE deleted_at IS NULL;
