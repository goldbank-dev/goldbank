-- Add explicit RLS policies for tables that had RLS enabled but no policies
CREATE POLICY "Users can view own idempotency keys"
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view idempotency keys"
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can view active token prices"
ON public.token_prices
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tokens t
    WHERE t.id = token_prices.token_id
      AND t.is_active = true
  )
);

CREATE POLICY "Admins can manage token prices"
ON public.token_prices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can view active token price history"
ON public.token_price_history
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tokens t
    WHERE t.id = token_price_history.token_id
      AND t.is_active = true
  )
);

CREATE POLICY "Admins can manage token price history"
ON public.token_price_history
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can view active token reserves"
ON public.token_reserves
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.tokens t
    WHERE t.id = token_reserves.token_id
      AND t.is_active = true
  )
);

CREATE POLICY "Admins can manage token reserves"
ON public.token_reserves
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Replace permissive public lead insertion with validation-backed insertion
DROP POLICY IF EXISTS "Anyone can join VIP list" ON public.leads;

CREATE POLICY "Anyone can join VIP list"
ON public.leads
FOR INSERT
TO public
WITH CHECK (
  name IS NOT NULL
  AND email IS NOT NULL
  AND length(btrim(name)) BETWEEN 2 AND 120
  AND length(btrim(email)) BETWEEN 5 AND 254
  AND btrim(email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND (
    phone IS NULL
    OR btrim(phone) = ''
    OR (
      length(btrim(phone)) BETWEEN 8 AND 30
      AND btrim(phone) ~ '^[0-9+(). -]+$'
    )
  )
);

-- Restrict admin policies so anonymous requests do not evaluate privileged role-check functions
ALTER POLICY "Only admins can view logs" ON public.admin_logs TO authenticated;
ALTER POLICY "Admins can manage all KYC" ON public.kyc_documents TO authenticated;
ALTER POLICY "Admins can manage tokens" ON public.tokens TO authenticated;
ALTER POLICY "Admins can manage settings" ON public.system_settings TO authenticated;
ALTER POLICY "Admins can manage all financial requests" ON public.financial_requests TO authenticated;
ALTER POLICY "Admins can manage all profiles" ON public.profiles TO authenticated;
ALTER POLICY "Admins can view audit logs" ON public.admin_audit_logs TO authenticated;
ALTER POLICY "Admins manage all accounts" ON public.ledger_accounts TO authenticated;
ALTER POLICY "Admins manage core_tx" ON public.core_transactions TO authenticated;
ALTER POLICY "Admins manage entries" ON public.transaction_entries TO authenticated;
ALTER POLICY "Admins can manage all permissions" ON public.user_permissions TO authenticated;

-- Harden helper functions that are callable by authenticated users so they only answer for the caller
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      LEFT JOIN public.user_permissions up ON up.user_id = ur.user_id
      WHERE ur.user_id = _user_id
        AND (
          ur.role = 'admin'::public.app_role
          OR (up.permission_key = _permission_key AND up.granted = true)
        )
    );
$$;

-- Set immutable search_path on mutable-path functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.simulate_kyc_analysis() SET search_path = public;
ALTER FUNCTION public.on_kyc_status_change() SET search_path = public;

-- Remove anonymous direct execution from privileged SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.create_ledger_deposit(uuid, numeric, public.currency_type, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_ledger_withdrawal(uuid, numeric, public.currency_type, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.perform_ledger_transfer(uuid, uuid, numeric, public.currency_type, public.tx_type, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_trade(text, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_admin_audit() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_ledger_balance_to_profile() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_ledger_balance() FROM anon, authenticated, PUBLIC;

-- Preserve intended signed-in RPC access only for functions with in-function identity checks
GRANT EXECUTE ON FUNCTION public.create_ledger_deposit(uuid, numeric, public.currency_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ledger_withdrawal(uuid, numeric, public.currency_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_ledger_transfer(uuid, uuid, numeric, public.currency_type, public.tx_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_trade(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;