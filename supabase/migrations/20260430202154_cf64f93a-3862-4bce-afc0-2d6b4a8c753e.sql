-- Extend profiles table with validation and address fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS document_type TEXT CHECK (document_type IN ('CPF', 'CNPJ')),
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Index for searching documents
CREATE INDEX IF NOT EXISTS idx_profiles_document ON public.profiles(document_number);

-- Update RLS for profiles to ensure users can update their own data
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);
