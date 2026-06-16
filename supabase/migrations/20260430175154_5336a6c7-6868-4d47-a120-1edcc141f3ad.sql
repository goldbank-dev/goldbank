-- Add explicit foreign key to profiles if not exists
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey_profiles,
ADD CONSTRAINT transactions_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Also add one for user_roles to profiles for consistency
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey_profiles,
ADD CONSTRAINT user_roles_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;