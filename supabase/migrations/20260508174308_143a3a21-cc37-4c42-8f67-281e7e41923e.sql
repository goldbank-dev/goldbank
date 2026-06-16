
ALTER TABLE public.security_audit_log
  ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS idx_security_audit_log_request
  ON public.security_audit_log(request_id);

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
DECLARE
  v_request_id text;
BEGIN
  -- Prefer caller-provided correlation id (set via SELECT set_config('app.request_id', '<uuid>', true))
  -- Fallback: use the current Postgres transaction id so all events from the same
  -- statement chain are grouped together.
  BEGIN
    v_request_id := NULLIF(current_setting('app.request_id', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_request_id := NULL;
  END;

  IF v_request_id IS NULL THEN
    v_request_id := 'tx-' || txid_current()::text;
  END IF;

  INSERT INTO public.security_audit_log (
    actor_id, event_type, reason, target_table, target_function,
    attempted_payload, metadata, request_id
  ) VALUES (
    auth.uid(), _event_type, _reason, _target_table, _target_function,
    _payload, _metadata, v_request_id
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(text, text, text, text, jsonb, jsonb) FROM public, anon, authenticated;
