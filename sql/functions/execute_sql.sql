-- Function to execute SQL statements safely
-- This function should only be callable by authenticated users with admin privileges
CREATE OR REPLACE FUNCTION execute_sql(sql_string text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if the user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only administrators can execute SQL statements';
  END IF;

  -- Log the SQL execution attempt
  INSERT INTO public.sql_execution_logs (
    user_id,
    sql_statement,
    execution_time
  ) VALUES (
    auth.uid(),
    sql_string,
    now()
  );

  -- Execute the SQL
  EXECUTE sql_string;
  
  -- Return success
  result := jsonb_build_object(
    'success', true,
    'message', 'SQL executed successfully',
    'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO public.sql_execution_logs (
    user_id,
    sql_statement,
    execution_time,
    error_message
  ) VALUES (
    auth.uid(),
    sql_string,
    now(),
    SQLERRM
  );
  
  -- Return error details
  result := jsonb_build_object(
    'success', false,
    'message', SQLERRM,
    'detail', SQLSTATE,
    'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  
  RETURN result;
END;
$$;

-- Create a table to log SQL executions if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sql_execution_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  sql_statement TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies to the logs table
ALTER TABLE public.sql_execution_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see the logs
CREATE POLICY "Admins can view SQL logs" ON public.sql_execution_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Grant permissions to execute the function
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated; 