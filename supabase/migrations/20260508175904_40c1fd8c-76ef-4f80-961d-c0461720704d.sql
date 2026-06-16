CREATE OR REPLACE FUNCTION public.mask_sensitive_jsonb(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.trg_mask_security_audit_payload()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.attempted_payload := public.mask_sensitive_jsonb(NEW.attempted_payload);
  NEW.metadata := public.mask_sensitive_jsonb(NEW.metadata);
  RETURN NEW;
END;
$function$;