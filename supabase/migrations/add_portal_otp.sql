-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_otp TEXT,
  ADD COLUMN IF NOT EXISTS portal_otp_expires_at TIMESTAMPTZ;
