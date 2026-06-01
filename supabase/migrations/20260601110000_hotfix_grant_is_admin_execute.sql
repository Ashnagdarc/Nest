-- Hotfix: restore execute permission for private.is_admin used in RLS policies
-- Symptoms fixed: "permission denied for function is_admin" during gear request line inserts.

DO $$
DECLARE
  fn_args text;
BEGIN
  SELECT pg_get_function_identity_arguments(p.oid)
    INTO fn_args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'private'
    AND p.proname = 'is_admin'
  LIMIT 1;

  IF fn_args IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION private.is_admin(%s) TO authenticated', fn_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION private.is_admin(%s) TO service_role', fn_args);
  END IF;
END $$;
