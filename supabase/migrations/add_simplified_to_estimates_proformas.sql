-- Extend the "simplified" (tax included, not itemized) toggle from invoices
-- to estimates and proformas.
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS is_simplified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS is_simplified BOOLEAN NOT NULL DEFAULT false;
