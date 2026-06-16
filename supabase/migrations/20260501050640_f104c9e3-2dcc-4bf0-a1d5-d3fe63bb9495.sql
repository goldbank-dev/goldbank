-- Extend app_role to include manager if not already there
DO $$ BEGIN
    ALTER TYPE public.app_role ADD VALUE 'manager';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table for granular permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL, -- e.g., 'manage_users', 'approve_kyc', 'manage_tokens'
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins manage all permissions
CREATE POLICY "Admins can manage all permissions" 
ON public.user_permissions FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
);

-- Helper function to check specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.user_permissions up ON up.user_id = ur.user_id
    WHERE ur.user_id = _user_id 
    AND (
      ur.role = 'admin' -- Admins have all permissions
      OR (up.permission_key = _permission_key AND up.granted = true)
    )
  );
$$;
