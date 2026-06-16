-- Add submission_id if not already present
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS submission_id UUID DEFAULT gen_random_uuid();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyc_submission ON public.kyc_documents(submission_id);

-- Ensure we have a trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_kyc_updated_at ON public.kyc_documents;
CREATE TRIGGER set_kyc_updated_at
BEFORE UPDATE ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
