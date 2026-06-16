-- 1. Create Audit Events Table
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB,
    error_message TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own audit events"
ON public.audit_events FOR SELECT
USING (auth.uid() = user_id);

-- 2. Update perform_ledger_transfer with Audit Logging
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
    v_error_msg TEXT;
BEGIN
    -- Initial log of the attempt
    INSERT INTO public.audit_events (user_id, event_type, status, payload, idempotency_key)
    VALUES (p_sender_id, 'TRANSFER_ATTEMPT', 'PENDING', 
            jsonb_build_object('receiver', p_receiver_id, 'amount', p_amount, 'currency', p_currency), 
            p_idempotency_key);

    -- 1. Validation: Amount must be positive
    IF p_amount <= 0 THEN
        v_error_msg := 'O valor da transferência deve ser maior que zero';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION '%', v_error_msg;
    END IF;

    -- 2. Validation: Prevent self-transfer
    IF p_sender_id = p_receiver_id THEN
        v_error_msg := 'Não é possível realizar transferências para o mesmo usuário';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION '%', v_error_msg;
    END IF;

    -- Check Idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response 
        FROM public.idempotency_keys 
        WHERE key = p_idempotency_key AND user_id = auth.uid();
        
        IF v_cached_response IS NOT NULL THEN
            RETURN v_cached_response;
        END IF;
    END IF;

    -- Get and Lock Accounts
    SELECT id, balance INTO v_sender_account_id, v_sender_balance 
    FROM public.ledger_accounts 
    WHERE user_id = p_sender_id AND currency = p_currency AND type = 'USER'
    FOR UPDATE;

    SELECT id INTO v_receiver_account_id 
    FROM public.ledger_accounts 
    WHERE user_id = p_receiver_id AND currency = p_currency AND type = 'USER'
    FOR UPDATE;

    -- Existence Checks
    IF v_sender_account_id IS NULL THEN
        v_error_msg := 'Conta do remetente não encontrada';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION '%', v_error_msg;
    END IF;
    
    IF v_receiver_account_id IS NULL THEN
        v_error_msg := 'Conta do destinatário não encontrada';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION '%', v_error_msg;
    END IF;

    -- Balance Check
    IF v_sender_balance < p_amount THEN
        v_error_msg := 'Saldo insuficiente';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION 'Saldo insuficiente (Saldo atual: %)', v_sender_balance;
    END IF;

    -- 1. Create Main Transaction Record
    INSERT INTO public.core_transactions (user_id, type, status, amount, currency, description)
    VALUES (p_sender_id, p_tx_type, 'COMPLETED', p_amount, p_currency, p_description)
    RETURNING id INTO v_transaction_id;

    -- 2. Double Entry: Debit Sender
    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_sender_account_id, 'DEBIT', p_amount);

    -- 3. Double Entry: Credit Receiver
    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_receiver_account_id, 'CREDIT', p_amount);

    v_cached_response := jsonb_build_object(
        'status', 'success',
        'transaction_id', v_transaction_id,
        'amount', p_amount,
        'currency', p_currency,
        'timestamp', now()
    );

    -- Final Success Log
    INSERT INTO public.audit_events (user_id, event_type, status, payload, idempotency_key)
    VALUES (p_sender_id, 'TRANSFER_SUCCESS', 'SUCCESS', v_cached_response, p_idempotency_key);

    -- Store Idempotency
    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data)
        VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
EXCEPTION WHEN OTHERS THEN
    -- Final Catch-all Failure Log
    INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
    VALUES (p_sender_id, 'TRANSFER_FAILURE', 'ERROR', SQLERRM, p_idempotency_key);
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
