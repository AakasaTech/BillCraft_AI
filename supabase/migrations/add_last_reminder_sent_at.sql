-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_reminder
  ON public.invoices (organization_id, due_date, last_reminder_sent_at)
  WHERE status IN ('sent', 'viewed', 'partial', 'overdue')
    AND deleted_at IS NULL
    AND due_date IS NOT NULL;
