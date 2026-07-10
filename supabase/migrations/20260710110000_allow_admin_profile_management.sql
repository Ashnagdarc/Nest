-- Allow active admins to manage other user profiles (suspend, role changes, etc.)
-- Uses SECURITY DEFINER to avoid RLS recursion when checking admin status.

CREATE OR REPLACE FUNCTION public.is_active_admin_from_profiles()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'Admin'
      AND p.status = 'Active'
  );
$$;

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;

CREATE POLICY "profiles_admin_manage"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_active_admin_from_profiles())
WITH CHECK (public.is_active_admin_from_profiles());

GRANT EXECUTE ON FUNCTION public.is_active_admin_from_profiles() TO authenticated, service_role;
