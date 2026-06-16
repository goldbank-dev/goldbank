-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    document_type,
    document_number,
    zip_code,
    street,
    number,
    neighborhood,
    city,
    state
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.raw_user_meta_data->>'document_type',
    NEW.raw_user_meta_data->>'document_number',
    NEW.raw_user_meta_data->>'zip_code',
    NEW.raw_user_meta_data->>'street',
    NEW.raw_user_meta_data->>'number',
    NEW.raw_user_meta_data->>'neighborhood',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
