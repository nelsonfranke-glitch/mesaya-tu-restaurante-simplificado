
-- 1. Update auto_create_profile trigger to NOT assign a role (users start pending)
CREATE OR REPLACE FUNCTION public.auto_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, restaurant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    '00000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO NOTHING;

  -- No role assigned by default; admin/manager will assign roles later
  RETURN NEW;
END;
$function$;

-- 2. Allow admin/manager to update user roles
CREATE POLICY "admin_update_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 3. Allow admin/manager to delete user roles
CREATE POLICY "admin_delete_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 4. Allow admin/manager to insert roles for any user in their restaurant
CREATE POLICY "admin_insert_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 5. Drop the old self-insert policy since admins handle it now
DROP POLICY IF EXISTS "insert_own_role" ON public.user_roles;
