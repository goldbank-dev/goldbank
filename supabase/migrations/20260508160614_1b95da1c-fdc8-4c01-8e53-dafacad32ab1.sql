
-- 1) Function to mask sensitive keys in a JSONB object
CREATE OR REPLACE FUNCTION public.mask_sensitive_jsonb(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_sensitive_keys text[] := ARRAY[
    'document_number', 'document_url', 'receipt_url', 'phone', 
    'email', 'street', 'number', 'complement', 'zip_code', 
    'display_name', 'cpf', 'rg', 'pix_key'
  ];
  v_key text;
  v_result jsonb := p_payload;
BEGIN
  IF p_payload IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH v_key IN ARRAY v_sensitive_keys
  LOOP
    IF v_result ? v_key THEN
      v_result := v_result || jsonb_build_object(v_key, '***MASKED***');
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- 2) Trigger function for security_audit_log
CREATE OR REPLACE FUNCTION public.trg_mask_security_audit_payload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.attempted_payload := public.mask_sensitive_jsonb(NEW.attempted_payload);
  NEW.metadata := public.mask_sensitive_jsonb(NEW.metadata);
  RETURN NEW;
END;
$$;

-- 3) Attach trigger to security_audit_log
DROP TRIGGER IF EXISTS trg_security_audit_masking ON public.security_audit_log;
CREATE TRIGGER trg_security_audit_masking
BEFORE INSERT ON public.security_audit_log
FOR EACH ROW EXECUTE FUNCTION public.trg_mask_security_audit_payload();
