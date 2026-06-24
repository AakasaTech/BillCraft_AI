-- Per-org late fee configuration
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS late_fee_enabled    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  ADD COLUMN IF NOT EXISTS late_fee_after_days INT          NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.organizations.late_fee_enabled    IS 'Whether to automatically add a late fee to overdue invoices';
COMMENT ON COLUMN public.organizations.late_fee_percentage IS 'Percentage of amount_due to charge as a late fee (e.g. 1.50 = 1.5%)';
COMMENT ON COLUMN public.organizations.late_fee_after_days IS 'Days after due_date before applying the late fee (0 = apply immediately when overdue)';

-- Track whether a late fee was already applied (prevents double-charging)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS late_fee_applied_at TIMESTAMPTZ;

-- Index to efficiently find overdue invoices that haven't had a fee applied yet
CREATE INDEX IF NOT EXISTS idx_invoices_late_fee
  ON public.invoices (organization_id, due_date)
  WHERE late_fee_applied_at IS NULL
    AND status IN ('sent', 'viewed', 'partial', 'overdue')
    AND deleted_at IS NULL
    AND due_date IS NOT NULL;
