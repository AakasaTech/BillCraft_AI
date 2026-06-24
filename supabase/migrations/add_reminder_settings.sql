-- Per-org automated reminder configuration
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS auto_reminders_enabled BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_offsets        INTEGER[] NOT NULL DEFAULT ARRAY[-3, 0, 7];

COMMENT ON COLUMN organizations.auto_reminders_enabled IS 'Whether the daily cron should auto-send payment reminders for this org';
COMMENT ON COLUMN organizations.reminder_offsets       IS 'Day offsets relative to due_date: negative = before due, 0 = on due, positive = days overdue';

-- Compound index for cron deduplication query:
--   WHERE invoice_id IN (...) AND sent_at >= <today_midnight>
CREATE INDEX IF NOT EXISTS idx_email_logs_invoice_sent
  ON public.email_logs (invoice_id, sent_at DESC)
  WHERE invoice_id IS NOT NULL;
