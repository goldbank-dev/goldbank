-- 1. Idempotency Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Professional Transfer Function (Double Entry)
CREATE OR REPLACE FUNCTION public.perform_ledger_transfer(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount DECIMAL,
    p_currency public.currency_type,
    p_tx_type public.tx_type,
    p_description TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_sender_account_id UUID;
    v_receiver_account_id UUID;
    v_transaction_id UUID;
    v_sender_balance DECIMAL;
    v_cached_response JSONB;
BEGIN
    -- Check Idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response 
        FROM public.idempotency_keys 
        WHERE key = p_idempotency_key AND user_id = auth.uid();
        
        IF v_cached_response IS NOT NULL THEN
            RETURN v_cached_response;
        END IF;
    END IF;

    -- Get Accounts
    SELECT id, balance INTO v_sender_account_id, v_sender_balance 
    FROM public.ledger_accounts 
    WHERE user_id = p_sender_id AND currency = p_currency AND type = 'USER'
    FOR UPDATE;

    SELECT id INTO v_receiver_account_id 
    FROM public.ledger_accounts 
    WHERE user_id = p_receiver_id AND currency = p_currency AND type = 'USER'
    FOR UPDATE;

    -- Validations
    IF v_sender_account_id IS NULL THEN
        RAISE EXCEPTION 'Conta do remetente não encontrada';
    END IF;
    
    IF v_receiver_account_id IS NULL THEN
        RAISE EXCEPTION 'Conta do destinatário não encontrada';
    END IF;

    IF v_sender_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    -- 1. Create Main Transaction Record
    INSERT INTO public.core_transactions (
        user_id, type, status, amount, currency, description
    ) VALUES (
        p_sender_id, p_tx_type, 'COMPLETED', p_amount, p_currency, p_description
    ) RETURNING id INTO v_transaction_id;

    -- 2. Double Entry: Debit Sender
    INSERT INTO public.transaction_entries (
        transaction_id, account_id, entry_type, amount
    ) VALUES (
        v_transaction_id, v_sender_account_id, 'DEBIT', p_amount
    );

    -- 3. Double Entry: Credit Receiver
    INSERT INTO public.transaction_entries (
        transaction_id, account_id, entry_type, amount
    ) VALUES (
        v_transaction_id, v_receiver_account_id, 'CREDIT', p_amount
    );

    v_cached_response := jsonb_build_object(
        'status', 'success',
        'transaction_id', v_transaction_id,
        'amount', p_amount,
        'currency', p_currency
    );

    -- Store Idempotency
    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data)
        VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
