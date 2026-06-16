-- Colunas para subconta Asaas individual por usuário
-- Cada usuário tem sua própria conta Asaas (não apenas customer)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_subconta_id  TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subconta_key TEXT;  -- apiKey da subconta (operações financeiras do usuário)

COMMENT ON COLUMN public.profiles.asaas_subconta_id  IS 'ID da subconta Asaas (acc_...)';
COMMENT ON COLUMN public.profiles.asaas_subconta_key IS 'API key da subconta Asaas para operações do usuário';
