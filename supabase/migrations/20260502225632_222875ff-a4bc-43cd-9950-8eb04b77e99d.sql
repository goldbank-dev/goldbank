
-- Helper: check KYC approval
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_documents
    WHERE user_id = _user_id AND status = 'approved'
  );
$$;

-- Helper: read kyc_required flag
CREATE OR REPLACE FUNCTION public.kyc_is_required()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((value->>'enabled')::boolean, false)
  FROM public.system_settings WHERE key = 'kyc_required';
$$;

-- Updated deposit: scope idempotency, enforce min_deposit
CREATE OR REPLACE FUNCTION public.create_ledger_deposit(p_user_id uuid, p_amount numeric, p_currency currency_type, p_description text DEFAULT 'Depósito em conta'::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_account_id UUID;
    v_system_account_id UUID;
    v_transaction_id UUID;
    v_cached_response JSONB;
    v_min_deposit NUMERIC;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: caller identity mismatch';
    END IF;

    -- Enforce min_deposit (only for BRL by default; applies to all if set)
    SELECT (value->>'amount')::numeric INTO v_min_deposit
    FROM public.system_settings WHERE key = 'min_deposit';
    IF v_min_deposit IS NULL THEN
      SELECT NULLIF(value::text, 'null')::numeric INTO v_min_deposit
      FROM public.system_settings WHERE key = 'min_deposit';
    END IF;
    IF v_min_deposit IS NOT NULL AND p_amount < v_min_deposit THEN
        RAISE EXCEPTION 'Valor mínimo de depósito é %', v_min_deposit;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response FROM public.idempotency_keys
          WHERE key = p_idempotency_key AND user_id = auth.uid();
        IF v_cached_response IS NOT NULL THEN RETURN v_cached_response; END IF;
    END IF;

    SELECT id INTO v_user_account_id FROM public.ledger_accounts WHERE user_id = p_user_id AND currency = p_currency AND type = 'USER' FOR UPDATE;
    SELECT id INTO v_system_account_id FROM public.ledger_accounts WHERE type = 'LIQUIDITY' AND currency = p_currency FOR UPDATE;

    IF v_user_account_id IS NULL OR v_system_account_id IS NULL THEN
        RAISE EXCEPTION 'Contas necessárias não encontradas';
    END IF;

    INSERT INTO public.core_transactions (user_id, type, status, amount, currency, description)
    VALUES (p_user_id, 'DEPOSIT', 'COMPLETED', p_amount, p_currency, p_description)
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_user_account_id, 'CREDIT', p_amount),
           (v_transaction_id, v_system_account_id, 'DEBIT', p_amount);

    v_cached_response := jsonb_build_object('status', 'success', 'transaction_id', v_transaction_id, 'type', 'DEPOSIT');

    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data) VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
END;
$function$;

-- Updated withdrawal: scope idempotency, enforce KYC, enforce daily cap
CREATE OR REPLACE FUNCTION public.create_ledger_withdrawal(p_user_id uuid, p_amount numeric, p_currency currency_type, p_description text DEFAULT 'Saque de conta'::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_account_id UUID;
    v_system_account_id UUID;
    v_transaction_id UUID;
    v_user_balance DECIMAL;
    v_cached_response JSONB;
    v_max_daily NUMERIC;
    v_today_total NUMERIC;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: caller identity mismatch';
    END IF;

    IF public.kyc_is_required() AND NOT public.is_kyc_approved(p_user_id) THEN
        RAISE EXCEPTION 'KYC não aprovado. Complete a verificação de identidade para realizar saques.';
    END IF;

    -- Enforce max_withdrawal_daily
    SELECT (value->>'amount')::numeric INTO v_max_daily
    FROM public.system_settings WHERE key = 'max_withdrawal_daily';
    IF v_max_daily IS NULL THEN
      SELECT NULLIF(value::text, 'null')::numeric INTO v_max_daily
      FROM public.system_settings WHERE key = 'max_withdrawal_daily';
    END IF;
    IF v_max_daily IS NOT NULL THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_today_total
      FROM public.core_transactions
      WHERE user_id = p_user_id
        AND type = 'WITHDRAW'
        AND status = 'COMPLETED'
        AND currency = p_currency
        AND created_at >= now() - interval '24 hours';
      IF v_today_total + p_amount > v_max_daily THEN
        RAISE EXCEPTION 'Limite diário de saque excedido (máx: %)', v_max_daily;
      END IF;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response FROM public.idempotency_keys
          WHERE key = p_idempotency_key AND user_id = auth.uid();
        IF v_cached_response IS NOT NULL THEN RETURN v_cached_response; END IF;
    END IF;

    SELECT id, balance INTO v_user_account_id, v_user_balance FROM public.ledger_accounts WHERE user_id = p_user_id AND currency = p_currency AND type = 'USER' FOR UPDATE;
    SELECT id INTO v_system_account_id FROM public.ledger_accounts WHERE type = 'LIQUIDITY' AND currency = p_currency FOR UPDATE;

    IF v_user_account_id IS NULL OR v_system_account_id IS NULL THEN
        RAISE EXCEPTION 'Contas necessárias não encontradas';
    END IF;

    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente para saque';
    END IF;

    INSERT INTO public.core_transactions (user_id, type, status, amount, currency, description)
    VALUES (p_user_id, 'WITHDRAW', 'COMPLETED', p_amount, p_currency, p_description)
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.transaction_entries (transaction_id, account_id, entry_type, amount)
    VALUES (v_transaction_id, v_user_account_id, 'DEBIT', p_amount),
           (v_transaction_id, v_system_account_id, 'CREDIT', p_amount);

    v_cached_response := jsonb_build_object('status', 'success', 'transaction_id', v_transaction_id, 'type', 'WITHDRAW');

    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.idempotency_keys (key, user_id, response_data) VALUES (p_idempotency_key, auth.uid(), v_cached_response);
    END IF;

    RETURN v_cached_response;
END;
$function$;

-- execute_trade: enforce KYC
CREATE OR REPLACE FUNCTION public.execute_trade(p_type text, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_price numeric;
  v_total numeric;
  v_gold numeric;
  v_currency numeric;
  v_new_gold numeric;
  v_new_currency numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF p_type NOT IN ('buy','sell') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;

  IF public.kyc_is_required() AND NOT public.is_kyc_approved(v_user) THEN
    RAISE EXCEPTION 'KYC não aprovado. Complete a verificação de identidade para negociar.';
  END IF;

  SELECT current_price INTO v_price FROM public.tokens WHERE symbol = 'GDK' AND is_active = true LIMIT 1;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Cotação indisponível'; END IF;
  v_total := p_amount * v_price;

  SELECT gold_balance, currency_balance INTO v_gold, v_currency
  FROM public.profiles WHERE user_id = v_user FOR UPDATE;

  IF p_type = 'buy' THEN
    IF v_currency < v_total THEN RAISE EXCEPTION 'Saldo em BRL insuficiente'; END IF;
    v_new_gold := v_gold + p_amount;
    v_new_currency := v_currency - v_total;
  ELSE
    IF v_gold < p_amount THEN RAISE EXCEPTION 'Saldo em GDK insuficiente'; END IF;
    v_new_gold := v_gold - p_amount;
    v_new_currency := v_currency + v_total;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount_grams, amount_currency, gold_price_at_time, description)
  VALUES (v_user, p_type, p_amount, v_total, v_price,
          (CASE WHEN p_type='buy' THEN 'Compra' ELSE 'Venda' END) || ' de ' || p_amount || 'g de GDK');

  UPDATE public.profiles
  SET gold_balance = v_new_gold,
      currency_balance = v_new_currency,
      updated_at = now()
  WHERE user_id = v_user;

  RETURN jsonb_build_object('status','success','price',v_price,'total',v_total,'gold_balance',v_new_gold,'currency_balance',v_new_currency);
END;
$function$;

-- perform_ledger_transfer: enforce KYC for sender
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
        RAISE EXCEPTION 'Saldo insuficiente (Saldo atual: %)', v_sender_balance;
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
