
-- 1) Prevent KYC self-approval: tighten INSERT policies
DROP POLICY IF EXISTS "Users can insert their own KYC docs" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can upload their own KYC" ON public.kyc_documents;

CREATE POLICY "Users can insert their own KYC docs"
ON public.kyc_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('pending', 'under_review')
);

-- 2) Restrict financial_requests currency
DROP POLICY IF EXISTS "Users can create their own financial requests" ON public.financial_requests;

CREATE POLICY "Users can create their own financial requests"
ON public.financial_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount > 0
  AND type IN ('deposit', 'withdraw')
  AND currency IN ('BRL', 'GDK')
);

-- 3) Hard guard on is_kyc_approved against cross-user probing
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.kyc_documents
    WHERE user_id = _user_id AND status = 'approved'
  );
END;
$function$;
