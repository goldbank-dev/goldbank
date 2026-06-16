DROP TRIGGER IF EXISTS audit_tokens_changes ON public.tokens;
CREATE TRIGGER audit_tokens_changes
AFTER INSERT OR UPDATE OR DELETE ON public.tokens
FOR EACH ROW EXECUTE FUNCTION public.process_admin_audit();