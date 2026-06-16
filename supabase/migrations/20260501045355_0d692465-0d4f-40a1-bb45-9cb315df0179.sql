CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);

-- Insert default transaction fee
INSERT INTO public.system_settings (key, value, description)
VALUES ('transaction_fee', '{"percentage": 0.1}', 'Taxa cobrada em compras e vendas de tokens')
ON CONFLICT (key) DO NOTHING;
