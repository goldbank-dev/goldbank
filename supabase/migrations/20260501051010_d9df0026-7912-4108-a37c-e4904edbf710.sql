-- Create the audit logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    target_table TEXT NOT NULL,
    target_id TEXT,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.admin_audit_logs FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
);

-- Function to record audit logs
CREATE OR REPLACE FUNCTION public.process_admin_audit()
RETURNS TRIGGER AS $$
BEGIN
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
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text 
            ELSE NEW.id::text 
        END,
        TG_OP,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to system_settings
DROP TRIGGER IF EXISTS audit_system_settings ON public.system_settings;
CREATE TRIGGER audit_system_settings
AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.process_admin_audit();

-- Apply trigger to user_roles
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.process_admin_audit();

-- Apply trigger to user_permissions
DROP TRIGGER IF EXISTS audit_user_permissions ON public.user_permissions;
CREATE TRIGGER audit_user_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.process_admin_audit();
