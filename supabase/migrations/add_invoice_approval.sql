-- Invoice approval workflow (Agency plan, multiple team members).
-- New status sits between draft and sent: draft -> pending_approval -> draft
-- (approved, now sendable) or draft (rejected, with a note). Must run as its
-- own statement before anything references the new enum value.
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'draft';

-- Approval fields on invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rejection_note TEXT;

-- Designated approvers. A per-user flag rather than a single org-level approver
-- column, so an org can name a short list rather than exactly one person.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_invoice_approver BOOLEAN NOT NULL DEFAULT false;

-- Fast lookup for "does this org have any approvers configured" (used to decide
-- whether the approval gate is actually active, so an Agency org with nobody
-- flagged yet doesn't get invoices stuck with no one able to approve them).
CREATE INDEX IF NOT EXISTS idx_users_org_approvers
  ON public.users (organization_id) WHERE is_invoice_approver = true AND deleted_at IS NULL;

