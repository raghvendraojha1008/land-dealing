-- Update the handle_new_user function to add both buyer and seller roles by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''));
  
  -- Assign both buyer and seller roles by default (allows switching between them)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer'), (NEW.id, 'seller');
  
  RETURN NEW;
END;
$$;