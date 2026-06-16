
-- Default settings (idempotent)
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('security_alert_webhook_url', to_jsonb(''::text), 'URL do webhook a ser chamado quando o limite de eventos *_BLOCKED for atingido'),
  ('security_alert_email', to_jsonb(''::text), 'E-mail destinatário do alerta de segurança'),
  ('security_alert_threshold', to_jsonb(25), 'Quantidade de eventos *_BLOCKED na janela que dispara o alerta'),
  ('security_alert_window_minutes', to_jsonb(15), 'Janela de tempo (em minutos) avaliada para o limite de alerta'),
  ('security_alert_cooldown_minutes', to_jsonb(15), 'Tempo mínimo (em minutos) entre dois alertas consecutivos')
ON CONFLICT (key) DO NOTHING;

-- Dispatch history (de-dupe + auditing)
CREATE TABLE IF NOT EXISTS public.security_alert_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  event_count integer NOT NULL,
  window_minutes integer NOT NULL,
  threshold integer NOT NULL,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  webhook_status text,
  email_status text,
  details jsonb
);

ALTER TABLE public.security_alert_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alert dispatches"
  ON public.security_alert_dispatches
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_security_alert_dispatches_dispatched_at
  ON public.security_alert_dispatches(dispatched_at DESC);
