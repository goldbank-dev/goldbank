-- Create storage bucket for KYC documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for KYC document uploads
CREATE POLICY "Users can upload their own KYC docs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'kyc-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own KYC docs" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'kyc-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all KYC docs" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'kyc-documents' AND 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
);

CREATE POLICY "Admins can delete KYC docs" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'kyc-documents' AND 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
);
