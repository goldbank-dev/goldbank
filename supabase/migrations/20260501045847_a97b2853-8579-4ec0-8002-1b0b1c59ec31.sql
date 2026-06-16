-- Enhance tokens table for better asset management
ALTER TABLE public.tokens 
ADD COLUMN IF NOT EXISTS total_supply NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS circulating_supply NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS custody_location TEXT DEFAULT 'Cofre Institucional SP',
ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT 'verified',
ADD COLUMN IF NOT EXISTS last_audit_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure profiles has all necessary fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT;

-- Create a table for deposit/withdrawal requests (Financial Operations)
CREATE TABLE IF NOT EXISTS public.financial_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    receipt_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for financial requests
ALTER TABLE public.financial_requests ENABLE ROW LEVEL SECURITY;

-- Policies for financial requests
CREATE POLICY "Users can view their own financial requests" 
ON public.financial_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial requests" 
ON public.financial_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all financial requests" 
ON public.financial_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role)
);

-- Update the tokens with initial data if needed
UPDATE public.tokens 
SET 
    total_supply = 1000000,
    circulating_supply = 50000,
    custody_location = 'Brinks Global Services - São Paulo',
    audit_status = 'verified'
WHERE symbol = 'GDK';
