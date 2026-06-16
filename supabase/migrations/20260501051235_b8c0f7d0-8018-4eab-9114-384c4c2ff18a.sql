-- 1. Create Enums (if not exists)
DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.tx_type AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'TOKEN_BUY', 'TOKEN_SELL', 'FEE', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.tx_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.account_type AS ENUM ('USER', 'SYSTEM', 'FEE', 'RESERVE', 'LIQUIDITY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.currency_type AS ENUM ('BRL', 'TOKEN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Professional Ledger Accounts
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    type public.account_type NOT NULL DEFAULT 'USER',
    currency public.currency_type NOT NULL DEFAULT 'BRL',
    balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Core Transactions
CREATE TABLE IF NOT EXISTS public.core_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id),
    type public.tx_type NOT NULL,
    status public.tx_status NOT NULL DEFAULT 'PENDING',
    amount DECIMAL(20, 8) NOT NULL,
    currency public.currency_type NOT NULL,
    description TEXT,
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Double Entry Entries
CREATE TABLE IF NOT EXISTS public.transaction_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.core_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Token Infrastructure
CREATE TABLE IF NOT EXISTS public.token_reserves (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.token_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
    price DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. RLS
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own accounts" ON public.ledger_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all accounts" ON public.ledger_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own core_tx" ON public.core_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage core_tx" ON public.core_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own entries" ON public.transaction_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.core_transactions ct WHERE ct.id = transaction_id AND ct.user_id = auth.uid())
);
CREATE POLICY "Admins manage entries" ON public.transaction_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. Trigger Logic
CREATE OR REPLACE FUNCTION public.update_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.entry_type = 'CREDIT') THEN
        UPDATE public.ledger_accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSE
        UPDATE public.ledger_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_ledger_entry_insert
AFTER INSERT ON public.transaction_entries
FOR EACH ROW EXECUTE FUNCTION public.update_ledger_balance();

-- 8. Initial Sync
-- BRL Accounts
INSERT INTO public.ledger_accounts (user_id, type, currency, balance)
SELECT user_id, 'USER', 'BRL', COALESCE(currency_balance, 0) FROM public.profiles
ON CONFLICT DO NOTHING;

-- TOKEN Accounts
INSERT INTO public.ledger_accounts (user_id, type, currency, balance)
SELECT user_id, 'USER', 'TOKEN', COALESCE(gold_balance, 0) FROM public.profiles
ON CONFLICT DO NOTHING;
