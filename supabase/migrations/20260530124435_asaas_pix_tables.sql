-- ─────────────────────────────────────────────────────────────────────────────
-- ASAAS PIX Integration Tables
-- Modelo custodial: GoldBank opera conta Asaas; usuários têm chaves/cobranças.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Chaves PIX do usuário ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pix_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  key_type     TEXT NOT NULL CHECK (key_type IN ('CPF','CNPJ','EMAIL','PHONE','EVP')),
  dict_status  TEXT NOT NULL DEFAULT 'LOCAL_ONLY',  -- LOCAL_ONLY | ACTIVE | PENDING_APPROVAL
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key)
);

ALTER TABLE public.pix_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pix_keys"
  ON public.pix_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pix_keys"
  ON public.pix_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own pix_keys"
  ON public.pix_keys FOR DELETE USING (auth.uid() = user_id);

-- ── Cobranças PIX geradas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pix_charges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_charge_id TEXT,                      -- ID da cobrança no Asaas
  qr_code_payload TEXT,                      -- copia e cola
  qr_code_base64  TEXT,                      -- imagem base64 (pode ser vazio)
  amount          NUMERIC(12,2) NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | CONFIRMED | EXPIRED
  is_mock         BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pix_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pix_charges"
  ON public.pix_charges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pix_charges"
  ON public.pix_charges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service-role update (webhook confirma pagamento)
CREATE POLICY "Service can update pix_charges"
  ON public.pix_charges FOR UPDATE USING (true);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pix_keys_user    ON public.pix_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_charges_user ON public.pix_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_charges_asaas ON public.pix_charges(asaas_charge_id);

-- ── Coluna asaas_customer_id na tabela profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS cpf_cnpj          TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS birth_date        TEXT,
  ADD COLUMN IF NOT EXISTS address           TEXT,
  ADD COLUMN IF NOT EXISTS address_number    TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood      TEXT,
  ADD COLUMN IF NOT EXISTS postal_code       TEXT,
  ADD COLUMN IF NOT EXISTS kyc_status        TEXT NOT NULL DEFAULT 'NOT_STARTED';
