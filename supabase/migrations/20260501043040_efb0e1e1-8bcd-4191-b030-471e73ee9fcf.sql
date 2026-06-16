-- Ensure kyc_documents table is properly configured
DO $$ 
BEGIN
    -- Add submission_id if not present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_documents' AND column_name = 'submission_id') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN submission_id UUID DEFAULT gen_random_uuid();
    END IF;

    -- Add document_url if not present (sometimes renamed or missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_documents' AND column_name = 'document_url') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN document_url TEXT;
    END IF;
END $$;

-- Create an index for submission_id for grouping multiple files
CREATE INDEX IF NOT EXISTS idx_kyc_submission_id ON public.kyc_documents(submission_id);

-- Ensure RLS is active for the table
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own documents
DROP POLICY IF EXISTS "Users can view their own KYC docs" ON public.kyc_documents;
CREATE POLICY "Users can view their own KYC docs" 
ON public.kyc_documents 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy to allow users to insert their own documents
DROP POLICY IF EXISTS "Users can insert their own KYC docs" ON public.kyc_documents;
CREATE POLICY "Users can insert their own KYC docs" 
ON public.kyc_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
