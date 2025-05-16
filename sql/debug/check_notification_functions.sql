-- Check existing notification-related functions
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname ILIKE '%notification%read%'
ORDER BY proname;
