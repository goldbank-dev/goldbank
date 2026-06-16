-- Add admin role if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Table for Tokens (Assets)
CREATE TABLE IF NOT EXISTS public.tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    total_supply NUMERIC DEFAULT 0,
    current_price NUMERIC NOT NULL,
    decimals INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Token Price History
CREATE TABLE IF NOT EXISTS public.token_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- KYC Documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update Transactions table with status and fee
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fee NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Insert initial Gold Token
INSERT INTO public.tokens (symbol, name, current_price)
VALUES ('GOLD', 'Gold Token', 350.50)
ON CONFLICT (symbol) DO NOTHING;

-- Ensure profile exists for admin user before adding role
INSERT INTO public.profiles (user_id, display_name)
VALUES ('16a49550-311f-4e3f-b719-8a0e7a6b29af', 'Admin Santek')
ON CONFLICT (user_id) DO NOTHING;

-- Grant Admin role to the specified user
DELETE FROM public.user_roles WHERE user_id = '16a49550-311f-4e3f-b719-8a0e7a6b29af';
INSERT INTO public.user_roles (user_id, role)
VALUES ('16a49550-311f-4e3f-b719-8a0e7a6b29af', 'admin');

-- Enable RLS on new tables
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Tokens
DROP POLICY IF EXISTS "Anyone can view active tokens" ON public.tokens;
CREATE POLICY "Anyone can view active tokens" ON public.tokens FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage tokens" ON public.tokens;
CREATE POLICY "Admins can manage tokens" ON public.tokens FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);

-- Policies for KYC
DROP POLICY IF EXISTS "Users can view their own KYC" ON public.kyc_documents;
CREATE POLICY "Users can view their own KYC" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can upload their own KYC" ON public.kyc_documents;
CREATE POLICY "Users can upload their own KYC" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all KYC" ON public.kyc_documents;
CREATE POLICY "Admins can manage all KYC" ON public.kyc_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);

-- Policies for Admin Logs
DROP POLICY IF EXISTS "Only admins can view logs" ON public.admin_logs;
CREATE POLICY "Only admins can view logs" ON public.admin_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);
