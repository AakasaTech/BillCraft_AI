-- Read-only version of next_invoice_number — does NOT increment the counter.
-- Used for displaying the upcoming number on the new invoice form.
-- The actual increment happens in next_invoice_number(), called only on save.

CREATE OR REPLACE FUNCTION public.peek_invoice_number(p_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  RETURN v_org.invoice_prefix
    || '-' || to_char(now(), 'YYYY')
    || '-' || lpad(v_org.next_invoice_number::TEXT, 4, '0');
END;
$$;
