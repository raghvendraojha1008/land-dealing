-- Allow users to add roles to themselves
CREATE POLICY "Users can add their own roles"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);