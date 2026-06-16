-- Ensure only admins can modify settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;

CREATE POLICY "Admins can manage settings" 
ON public.system_settings FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);

-- Ensure profiles are protected but admins can manage them
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
);
