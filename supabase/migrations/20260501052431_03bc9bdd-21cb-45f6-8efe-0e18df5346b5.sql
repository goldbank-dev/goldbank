-- Create Sync Function
CREATE OR REPLACE FUNCTION public.sync_ledger_balance_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'USER' THEN
        IF NEW.currency = 'BRL' THEN
            UPDATE public.profiles 
            SET currency_balance = NEW.balance,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        ELSIF NEW.currency = 'GDK' THEN
            UPDATE public.profiles 
            SET gold_balance = NEW.balance,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create Trigger
DROP TRIGGER IF EXISTS trigger_sync_ledger_balance ON public.ledger_accounts;
CREATE TRIGGER trigger_sync_ledger_balance
AFTER UPDATE ON public.ledger_accounts
FOR EACH ROW
EXECUTE FUNCTION public.sync_ledger_balance_to_profile();
