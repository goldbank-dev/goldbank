CREATE OR REPLACE FUNCTION public.perform_ledger_transfer(p_sender_id uuid, p_receiver_id uuid, p_amount numeric, p_currency currency_type, p_tx_type tx_type, p_description text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_sender_account_id UUID;
    v_receiver_account_id UUID;
    v_transaction_id UUID;
    v_sender_balance DECIMAL;
    v_cached_response JSONB;
    v_error_msg TEXT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_sender_id THEN
        RAISE EXCEPTION 'Unauthorized: caller identity mismatch';
    END IF;

    IF public.kyc_is_required() AND NOT public.is_kyc_approved(p_sender_id) THEN
        RAISE EXCEPTION 'KYC não aprovado. Complete a verificação de identidade para transferir.';
    END IF;

    INSERT INTO public.audit_events (user_id, event_type, status, payload, idempotency_key)
    VALUES (p_sender_id, 'TRANSFER_ATTEMPT', 'PENDING',
            jsonb_build_object('receiver', p_receiver_id, 'amount', p_amount, 'currency', p_currency),
            p_idempotency_key);

    IF p_amount <= 0 THEN
        v_error_msg := 'O valor da transferência deve ser maior que zero';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION '%', v_error_msg;
    END IF;

    IF p_sender_id = p_receiver_id THEN
        v_error_msg := 'Não é possível realizar transferências para o mesmo usuário';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION '%', v_error_msg;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response
        FROM public.idempotency_keys
        WHERE key = p_idempotency_key AND user_id = auth.uid();
        IF v_cached_response IS NOT NULL THEN RETURN v_cached_response; END IF;
    END IF;

    SELECT id, balance INTO v_sender_account_id, v_sender_balance
    FROM public.ledger_accounts
    WHERE user_id = p_sender_id AND currency = p_currency AND type = 'USER' FOR UPDATE;

    SELECT id INTO v_receiver_account_id
    FROM public.ledger_accounts
    WHERE user_id = p_receiver_id AND currency = p_currency AND type = 'USER' FOR UPDATE;

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

    IF v_sender_balance < p_amount THEN
        v_error_msg := 'Saldo insuficiente';
        INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
        VALUES (p_sender_id, 'TRANSFER_FAILURE', 'FAILURE', v_error_msg, p_idempotency_key);
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    INSERT INTO public.core_transactions (user_id, type, status, amount, currency, description)
    VALUES (p_sender_id, p_tx_type, 'COMPLETED', p_amount, p_currency, p_description)
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_sender_account_id, 'DEBIT', p_amount);

    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_receiver_account_id, 'CREDIT', p_amount);

    v_cached_response := jsonb_build_object(
        'status', 'success',
        'transaction_id', v_transaction_id,
        'amount', p_amount,
        'currency', p_currency,
        'timestamp', now()
    );

    INSERT INTO public.audit_events (user_id, event_type, status, payload, idempotency_key)
    VALUES (p_sender_id, 'TRANSFER_SUCCESS', 'SUCCESS', v_cached_response, p_idempotency_key);

    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data)
        VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.audit_events (user_id, event_type, status, error_message, idempotency_key)
    VALUES (p_sender_id, 'TRANSFER_FAILURE', 'ERROR', SQLERRM, p_idempotency_key);
    RAISE;
END;
$function$;