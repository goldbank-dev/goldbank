
DROP POLICY IF EXISTS "Users can insert their own KYC docs" ON public.kyc_documents;

CREATE POLICY "Users can insert their own KYC docs"
ON public.kyc_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'under_review'
);
