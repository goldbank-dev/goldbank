INSERT INTO public.system_settings (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false}'::jsonb, 'Modo manutenção - bloqueia acesso de usuários comuns'),
  ('kyc_required', '{"enabled": true}'::jsonb, 'Exige KYC aprovado para operações'),
  ('min_deposit', '{"value": 50}'::jsonb, 'Depósito mínimo em BRL'),
  ('max_withdrawal_daily', '{"value": 50000}'::jsonb, 'Saque máximo diário em BRL'),
  ('platform_name', '{"value": "GoldBank"}'::jsonb, 'Nome da plataforma exibido para usuários')
ON CONFLICT (key) DO NOTHING;