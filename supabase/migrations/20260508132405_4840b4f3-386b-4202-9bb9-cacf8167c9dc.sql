
-- 1) Guard is_kyc_approved against cross-user enumeration
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_documents
    WHERE user_id = _user_id
      AND status = 'approved'
      AND (
        _user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  );
$function$;

-- 2) Tighten financial_requests INSERT policy
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
);

-- 3) Defence-in-depth: positive amount constraint
ALTER TABLE public.financial_requests
  DROP CONSTRAINT IF EXISTS financial_requests_amount_positive;
ALTER TABLE public.financial_requests
  ADD CONSTRAINT financial_requests_amount_positive CHECK (amount > 0);
