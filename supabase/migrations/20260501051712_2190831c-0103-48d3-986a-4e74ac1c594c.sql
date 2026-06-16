-- Ensure system accounts exist for liquidity and fees
DO $$ 
DECLARE
    v_system_user_id UUID;
BEGIN
    -- We can use a NULL user_id for system-wide accounts or a dedicated admin UID if available.
    -- For this implementation, we'll ensure at least one 'SYSTEM' type account exists per currency.
    
    IF NOT EXISTS (SELECT 1 FROM public.ledger_accounts WHERE type = 'LIQUIDITY' AND currency = 'BRL') THEN
        INSERT INTO public.ledger_accounts (type, currency, balance) VALUES ('LIQUIDITY', 'BRL', 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.ledger_accounts WHERE type = 'FEE' AND currency = 'BRL') THEN
        INSERT INTO public.ledger_accounts (type, currency, balance) VALUES ('FEE', 'BRL', 0);
    END IF;
END $$;

-- 1. Deposit Function (Double Entry)
-- User Credit / System Liquidity Debit
CREATE OR REPLACE FUNCTION public.create_ledger_deposit(
    p_user_id UUID,
    p_amount DECIMAL,
    p_currency public.currency_type,
    p_description TEXT DEFAULT 'Depósito em conta',
    p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_account_id UUID;
    v_system_account_id UUID;
    v_transaction_id UUID;
    v_cached_response JSONB;
BEGIN
    -- Check Idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response FROM public.idempotency_keys WHERE key = p_idempotency_key;
        IF v_cached_response IS NOT NULL THEN RETURN v_cached_response; END IF;
    END IF;

    -- Get Accounts
    SELECT id INTO v_user_account_id FROM public.ledger_accounts WHERE user_id = p_user_id AND currency = p_currency AND type = 'USER' FOR UPDATE;
    SELECT id INTO v_system_account_id FROM public.ledger_accounts WHERE type = 'LIQUIDITY' AND currency = p_currency FOR UPDATE;

    IF v_user_account_id IS NULL OR v_system_account_id IS NULL THEN
        RAISE EXCEPTION 'Contas necessárias não encontradas';
    END IF;

    -- Create Transaction
    INSERT INTO public.core_transactions (user_id, type, status, amount, currency, description)
    VALUES (p_user_id, 'DEPOSIT', 'COMPLETED', p_amount, p_currency, p_description)
    RETURNING id INTO v_transaction_id;

    -- Double Entry: Credit User / Debit System Liquidity
    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_user_account_id, 'CREDIT', p_amount),
           (v_transaction_id, v_system_account_id, 'DEBIT', p_amount);

    v_cached_response := jsonb_build_object('status', 'success', 'transaction_id', v_transaction_id, 'type', 'DEPOSIT');
    
    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data) VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Withdrawal Function (Double Entry)
-- User Debit / System Liquidity Credit
CREATE OR REPLACE FUNCTION public.create_ledger_withdrawal(
    p_user_id UUID,
    p_amount DECIMAL,
    p_currency public.currency_type,
    p_description TEXT DEFAULT 'Saque de conta',
    p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_account_id UUID;
    v_system_account_id UUID;
    v_transaction_id UUID;
    v_user_balance DECIMAL;
    v_cached_response JSONB;
BEGIN
    -- Check Idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response FROM public.idempotency_keys WHERE key = p_idempotency_key;
        IF v_cached_response IS NOT NULL THEN RETURN v_cached_response; END IF;
    END IF;

    -- Get Accounts
    SELECT id, balance INTO v_user_account_id, v_user_balance FROM public.ledger_accounts WHERE user_id = p_user_id AND currency = p_currency AND type = 'USER' FOR UPDATE;
    SELECT id INTO v_system_account_id FROM public.ledger_accounts WHERE type = 'LIQUIDITY' AND currency = p_currency FOR UPDATE;

    IF v_user_account_id IS NULL OR v_system_account_id IS NULL THEN
        RAISE EXCEPTION 'Contas necessárias não encontradas';
    END IF;

    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente para saque';
    END IF;

    -- Create Transaction
    INSERT INTO public.core_transactions (user_id, type, status, amount, currency, description)
    VALUES (p_user_id, 'WITHDRAW', 'COMPLETED', p_amount, p_currency, p_description)
    RETURNING id INTO v_transaction_id;

    -- Double Entry: Debit User / Credit System Liquidity
    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_user_account_id, 'DEBIT', p_amount),
           (v_transaction_id, v_system_account_id, 'CREDIT', p_amount);

    v_cached_response := jsonb_build_object('status', 'success', 'transaction_id', v_transaction_id, 'type', 'WITHDRAW');
    
    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data) VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
