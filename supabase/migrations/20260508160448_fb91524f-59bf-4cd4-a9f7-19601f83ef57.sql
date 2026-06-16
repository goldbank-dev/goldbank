
-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  event_type text NOT NULL,
  target_table text,
  target_function text,
  reason text NOT NULL,
  attempted_payload jsonb,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_actor ON public.security_audit_log(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event ON public.security_audit_log(event_type, occurred_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security audit log" ON public.security_audit_log;
CREATE POLICY "Admins can view security audit log"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- No INSERT/UPDATE/DELETE policies: only SECURITY DEFINER helpers may write.

-- 2) Helper function (SECURITY DEFINER) — bypasses RLS to write the log
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _reason text,
  _target_table text DEFAULT NULL,
  _target_function text DEFAULT NULL,
  _payload jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    actor_id, event_type, reason, target_table, target_function, attempted_payload, metadata
  ) VALUES (
    auth.uid(), _event_type, _reason, _target_table, _target_function, _payload, _metadata
  );
EXCEPTION WHEN OTHERS THEN
  -- never let logging failure break the parent statement
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(text, text, text, text, jsonb, jsonb) FROM public, anon, authenticated;

-- 3) is_kyc_approved: log unauthorized probes before raising
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    PERFORM public.log_security_event(
      'KYC_PROBE_BLOCKED',
      'Caller attempted to read another user''s KYC status',
      'kyc_documents',
      'is_kyc_approved',
      jsonb_build_object('requested_user_id', _user_id),
      NULL
    );
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.kyc_documents
    WHERE user_id = _user_id AND status = 'approved'
  );
END;
$function$;

-- 4) BEFORE INSERT trigger on kyc_documents — log + reject invalid status from non-admins
CREATE OR REPLACE FUNCTION public.audit_kyc_documents_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid()
       OR NEW.status IS DISTINCT FROM 'under_review' THEN
      PERFORM public.log_security_event(
        'KYC_INSERT_BLOCKED',
        'Invalid KYC submission (user_id mismatch or disallowed status)',
        'kyc_documents',
        NULL,
        jsonb_build_object(
          'attempted_user_id', NEW.user_id,
          'attempted_status', NEW.status,
          'document_type', NEW.document_type
        ),
        NULL
      );
      RAISE EXCEPTION 'Invalid KYC submission' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_kyc_documents_insert ON public.kyc_documents;
CREATE TRIGGER trg_audit_kyc_documents_insert
BEFORE INSERT ON public.kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_kyc_documents_insert();

-- 5) BEFORE INSERT trigger on financial_requests
CREATE OR REPLACE FUNCTION public.audit_financial_requests_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reason text := NULL;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      v_reason := 'user_id mismatch';
    ELSIF NEW.status IS DISTINCT FROM 'pending' THEN
      v_reason := 'disallowed status (must be pending)';
    ELSIF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      v_reason := 'non-positive amount';
    ELSIF NEW.type NOT IN ('deposit', 'withdraw') THEN
      v_reason := 'invalid type';
    ELSIF NEW.currency NOT IN ('BRL', 'GDK') THEN
      v_reason := 'invalid currency';
    END IF;

    IF v_reason IS NOT NULL THEN
      PERFORM public.log_security_event(
        'FIN_REQUEST_INSERT_BLOCKED',
        v_reason,
        'financial_requests',
        NULL,
        jsonb_build_object(
          'attempted_user_id', NEW.user_id,
          'attempted_status', NEW.status,
          'attempted_amount', NEW.amount,
          'attempted_type', NEW.type,
          'attempted_currency', NEW.currency
        ),
        NULL
      );
      RAISE EXCEPTION 'Invalid financial request: %', v_reason USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_financial_requests_insert ON public.financial_requests;
CREATE TRIGGER trg_audit_financial_requests_insert
BEFORE INSERT ON public.financial_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_financial_requests_insert();
