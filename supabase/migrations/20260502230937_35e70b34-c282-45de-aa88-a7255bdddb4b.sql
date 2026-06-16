-- Revoke execute from anon/public on SECURITY DEFINER RPCs; keep for authenticated
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.execute_trade(text, numeric)',
    'public.create_ledger_deposit(uuid, numeric, currency_type, text, text)',
    'public.create_ledger_withdrawal(uuid, numeric, currency_type, text, text)',
    'public.perform_ledger_transfer(uuid, uuid, numeric, currency_type, tx_type, text, text)',
    'public.has_role(uuid, app_role)',
    'public.has_permission(uuid, text)',
    'public.is_kyc_approved(uuid)',
    'public.kyc_is_required()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;