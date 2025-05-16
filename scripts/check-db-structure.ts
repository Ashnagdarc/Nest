import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabaseStructure() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  console.log('Checking database structure...');

  try {
    // Check gear_requests table
    const { data: gearRequests, error: gearRequestsError } = await supabase
      .from('gear_requests')
      .select('id')
      .limit(1);

    if (gearRequestsError) {
      console.error('Error with gear_requests table:', gearRequestsError.message);
    } else {
      console.log('✓ gear_requests table exists');
    }

    // Check gears table
    const { data: gears, error: gearsError } = await supabase
      .from('gears')
      .select('id')
      .limit(1);

    if (gearsError) {
      console.error('Error with gears table:', gearsError.message);
    } else {
      console.log('✓ gears table exists');
    }

    // Check get_popular_gears function
    const { data: popularGears, error: popularGearsError } = await supabase
      .rpc('get_popular_gears', {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      });

    if (popularGearsError) {
      console.error('Error with get_popular_gears function:', popularGearsError.message);
    } else {
      console.log('✓ get_popular_gears function works');
    }

    // Additional checks for table structure
    const { data: gearColumns, error: gearColumnsError } = await supabase
      .from('gears')
      .select()
      .limit(1);

    if (gearColumnsError) {
      console.error('Error checking gear columns:', gearColumnsError.message);
    } else {
      const firstGear = gearColumns[0];
      if (firstGear) {
        console.log('\nGear table structure:');
        Object.keys(firstGear).forEach(column => {
          console.log(`  - ${column}`);
        });
      }
    }

  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkDatabaseStructure();
