CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  _target_user_id uuid,
  _new_role public.app_role,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_old_role public.app_role;
BEGIN
  -- 1. Auth check
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- 2. Caller must be an existing admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller AND role = 'admin'::public.app_role
  ) THEN
    PERFORM public.log_security_event(
      'ROLE_CHANGE_BLOCKED',
      'Non-admin attempted to change user role',
      'user_roles',
      'admin_change_user_role',
      jsonb_build_object('target_user_id', _target_user_id, 'attempted_role', _new_role),
      NULL
    );
    RAISE EXCEPTION 'Permissão negada: somente administradores podem alterar cargos' USING ERRCODE = '42501';
  END IF;

  -- 3. Validate target
  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário alvo é obrigatório';
  END IF;

  -- 4. Require reason for admin promotions/demotions
  SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = _target_user_id LIMIT 1;
  
  IF (_new_role = 'admin'::public.app_role OR v_old_role = 'admin'::public.app_role)
     AND (_reason IS NULL OR length(btrim(_reason)) < 3) THEN
    RAISE EXCEPTION 'Motivo é obrigatório para alterações envolvendo o cargo de administrador';
  END IF;

  -- 5. Prevent self-demotion of last admin
  IF v_old_role = 'admin'::public.app_role
     AND _new_role <> 'admin'::public.app_role
     AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin'::public.app_role) <= 1 THEN
    RAISE EXCEPTION 'Não é possível remover o único administrador do sistema';
  END IF;

  -- 6. Apply change
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);

  -- 7. Audit log
  INSERT INTO public.admin_audit_logs (admin_id, target_table, target_id, operation, old_value, new_value)
  VALUES (
    v_caller,
    'user_roles',
    _target_user_id::text,
    CASE
      WHEN _new_role = 'admin'::public.app_role THEN 'promotion'
      WHEN v_old_role = 'admin'::public.app_role THEN 'demotion'
      ELSE 'role_change'
    END,
    jsonb_build_object('role', COALESCE(v_old_role::text, 'user')),
    jsonb_build_object('role', _new_role::text, 'reason', _reason)
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'target_user_id', _target_user_id,
    'old_role', COALESCE(v_old_role::text, 'user'),
    'new_role', _new_role::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_user_role(uuid, public.app_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, public.app_role, text) TO authenticated;