-- Approval workflow for Quotes (estimates) and Proformas, mirroring the existing
-- invoice approval flow. Same draft -> pending_approval -> draft (approved, now
-- sendable) or draft (rejected, with a note) lifecycle. The org-level approver
-- flag (users.is_invoice_approver) and the Agency-plan gate are shared, and a new
-- org-level switch (approval_flow_enabled) lets the owner turn the whole flow on/off.

-- ── Organization toggle: master enable/disable for the approval flow ────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS approval_flow_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── Estimates --------------------------------------------------------------------
-- Inline CHECK constraints can't be ALTERed to add a value, so drop + recreate.
ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_status_check
  CHECK (status IN ('draft','pending_approval','sent','viewed','accepted','declined','expired'));

ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS rejection_note TEXT;

-- ── Proformas --------------------------------------------------------------------
ALTER TABLE public.proformas DROP CONSTRAINT IF EXISTS proformas_status_check;
ALTER TABLE public.proformas
  ADD CONSTRAINT proformas_status_check
  CHECK (status IN ('draft','pending_approval','sent','viewed','accepted','converted','expired'));

ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS rejection_note TEXT;
