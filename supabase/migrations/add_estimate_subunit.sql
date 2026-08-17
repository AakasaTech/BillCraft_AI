-- Client sub-unit support on estimates, matching invoices/proformas.
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS client_subunit_id UUID REFERENCES public.client_subunits(id);
