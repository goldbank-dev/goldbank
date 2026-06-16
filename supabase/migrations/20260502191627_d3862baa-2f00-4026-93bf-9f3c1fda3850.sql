-- Block users from directly mutating financial balance fields on their own profile.
-- Balances must change only via SECURITY DEFINER RPCs (execute_trade, ledger functions)
-- which run as the function owner and are unaffected by this trigger.

CREATE OR REPLACE FUNCTION public.prevent_user_balance_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND (
       NEW.gold_balance IS DISTINCT FROM OLD.gold_balance
       OR NEW.currency_balance IS DISTINCT FROM OLD.currency_balance
     ) THEN
    RAISE EXCEPTION 'Direct balance updates are not allowed. Use the trade/ledger RPCs.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_balance_update ON public.profiles;
CREATE TRIGGER profiles_block_balance_update
BEFORE UPDATE OF gold_balance, currency_balance ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_balance_update();

REVOKE EXECUTE ON FUNCTION public.prevent_user_balance_update() FROM anon, authenticated, PUBLIC;