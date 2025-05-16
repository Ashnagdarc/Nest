import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listTables() {
  const supabase = createClient(
    'https://lkgxzrvcozfxydpmbtqq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      db: {
        schema: 'public'
      }
    }
  );

  try {
    // Query to list all tables in the public schema
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Tables in your database:');
    console.log(data);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

listTables();
