-- Phase 4: enforce server-only execution for SECURITY DEFINER functions
-- After moving client flows to API routes, authenticated users should no longer
-- execute SECURITY DEFINER RPCs directly.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private')
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated, anon, PUBLIC',
      r.schema_name,
      r.function_name,
      r.args
    );

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;
