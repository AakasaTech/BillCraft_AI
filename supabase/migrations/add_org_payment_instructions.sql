-- Run this in Supabase → SQL Editor
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payment_instructions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Validate the array never exceeds 5 items
ALTER TABLE organizations
  ADD CONSTRAINT payment_instructions_max_5
  CHECK (jsonb_array_length(payment_instructions) <= 5);
