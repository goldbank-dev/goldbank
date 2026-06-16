CREATE OR REPLACE FUNCTION public.process_admin_audit()
RETURNS TRIGGER AS $$
DECLARE
    target_id TEXT;
BEGIN
    -- Only audit if we have an authenticated user
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Try to get ID, fall back to key if ID doesn't exist
    BEGIN
        IF TG_OP = 'DELETE' THEN
            target_id := OLD.id::text;
        ELSE
            target_id := NEW.id::text;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        BEGIN
            IF TG_OP = 'DELETE' THEN
                target_id := OLD.key::text;
            ELSE
                target_id := NEW.key::text;
            END IF;
        EXCEPTION WHEN undefined_column THEN
            target_id := 'unknown';
        END;
    END;

    INSERT INTO public.admin_audit_logs (
        admin_id,
        target_table,
        target_id,
        operation,
        old_value,
        new_value
    ) VALUES (
        auth.uid(),
        TG_TABLE_NAME,
        target_id,
        TG_OP,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;