-- Add cc_emails to clients table for invoice/reminder CC recipients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cc_emails JSONB NOT NULL DEFAULT '[]';
