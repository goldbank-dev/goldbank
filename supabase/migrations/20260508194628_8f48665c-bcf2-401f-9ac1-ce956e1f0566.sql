-- Create a function to allow admins to reset user passwords
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id UUID;
  caller_is_admin BOOLEAN;
  result JSONB;
BEGIN
  -- Get the ID of the user calling the function
  caller_id := auth.uid();
  
  -- Check if caller is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = caller_id AND role = 'admin'
  ) INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem realizar esta ação.';
  END IF;

  -- Use Supabase Auth Admin API to update the user's password
  -- Note: This requires the service_role key if called from an edge function,
  -- but since we're in PL/pgSQL with SECURITY DEFINER, we have elevated privileges.
  -- However, directly updating auth.users password requires hashing.
  -- A better approach for PL/pgSQL is to update the encrypted_password column if we knew the hash format,
  -- but it's safer to use the built-in auth functions if available.
  
  -- Since SECURITY DEFINER functions run with the privileges of the creator (usually postgres),
  -- they can modify the auth.users table.
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Log the action to admin audit logs if the table exists
  INSERT INTO public.admin_audit_logs (
    admin_id,
    target_user_id,
    action_type,
    details
  ) VALUES (
    caller_id,
    target_user_id,
    'password_reset',
    jsonb_build_object('reason', 'Admin requested password reset')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Senha alterada com sucesso');
END;
$$;

-- Grant execute permission to authenticated users (the function checks for admin role inside)
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;