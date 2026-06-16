
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'security-alert-monitor-every-5min';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'security-alert-monitor-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ezhivjjscdlbuexttlrj.supabase.co/functions/v1/security-alert-monitor',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aGl2ampzY2RsYnVleHR0bHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMzMDIsImV4cCI6MjA5MzEzOTMwMn0.VDQ3QM-J753Q165Cnp5phbSSFoENzkdfApPtzH4860A"}'::jsonb,
    body := jsonb_build_object('source','cron','at',now())
  );
  $$
);
