import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function executeCleanup() {
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'sql', 'cleanup', 'remove_unused_tables.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // First verify if tables exist
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['announcements_backup', 'admin_reports_data', 'gear_calendar_bookings_with_profiles'])
      .eq('table_schema', 'public')

    if (tableError) {
      console.error('Error checking tables:', tableError)
      return
    }

    console.log('Found tables:', tables)

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('Error executing cleanup:', error)
      return
    }

    console.log('Successfully executed table cleanup')

    // Verify the view was created
    const { data: view, error: viewError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_name', 'gear_calendar_bookings_with_profiles')
      .eq('table_schema', 'public')
      .single()

    if (viewError) {
      console.error('Error verifying view:', viewError)
      return
    }

    if (view) {
      console.log('Successfully created view: gear_calendar_bookings_with_profiles')
    }

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

executeCleanup()
