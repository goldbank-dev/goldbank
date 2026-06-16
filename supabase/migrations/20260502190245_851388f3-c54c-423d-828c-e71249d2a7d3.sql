
-- 1) Profiles: drop public-read policy, keep owner + admin policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Add caller-identity guards to ledger functions
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
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: caller identity mismatch';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response FROM public.idempotency_keys WHERE key = p_idempotency_key;
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
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: caller identity mismatch';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT response_data INTO v_cached_response FROM public.idempotency_keys WHERE key = p_idempotency_key;
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

-- Revoke EXECUTE from anon on financial functions
REVOKE EXECUTE ON FUNCTION public.create_ledger_deposit(uuid, numeric, currency_type, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_ledger_withdrawal(uuid, numeric, currency_type, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.perform_ledger_transfer(uuid, uuid, numeric, currency_type, tx_type, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ledger_deposit(uuid, numeric, currency_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ledger_withdrawal(uuid, numeric, currency_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_ledger_transfer(uuid, uuid, numeric, currency_type, tx_type, text, text) TO authenticated;

-- 3) user_roles: prevent self-grant of admin via direct INSERT/UPDATE/DELETE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Users can view own role') THEN
    CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Admins manage user_roles') THEN
    CREATE POLICY "Admins manage user_roles" ON public.user_roles FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 4) Server-side execute_trade so balance writes are no longer client-controlled
CREATE OR REPLACE FUNCTION public.execute_trade(p_type text, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.execute_trade(text, numeric) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_trade(text, numeric) TO authenticated;
