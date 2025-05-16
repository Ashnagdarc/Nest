/**
 * Supabase Realtime Checker Utility
 * 
 * This script helps check which tables have Realtime enabled in your Supabase project.
 * It also provides guidance on how to enable Realtime for tables that need it.
 */

import { checkRealtimeStatus } from '../lib/utils/realtime-utils';
import logger from '../lib/logger';

async function checkAndPrintRealtimeStatus() {
    console.log('🔍 Checking Supabase Realtime status for all tables...');
    console.log('---------------------------------------------------');

    try {
        const status = await checkRealtimeStatus();
        const enabledTables = Object.entries(status).filter(([_, enabled]) => enabled);
        const disabledTables = Object.entries(status).filter(([_, enabled]) => !enabled);

        console.log('\n✅ Tables with Realtime ENABLED:');
        if (enabledTables.length > 0) {
            enabledTables.forEach(([table]) => {
                console.log(`   - ${table}`);
            });
        } else {
            console.log('   No tables have Realtime enabled.');
        }

        console.log('\n❌ Tables with Realtime DISABLED:');
        if (disabledTables.length > 0) {
            disabledTables.forEach(([table]) => {
                console.log(`   - ${table}`);
            });
        } else {
            console.log('   All tables have Realtime enabled!');
        }

        // Provide guidance if any tables need Realtime enabled
        if (disabledTables.length > 0) {
            console.log('\n📋 How to enable Realtime:');
            console.log('1. Go to your Supabase dashboard: https://app.supabase.io');
            console.log('2. Select your project');
            console.log('3. Go to "Database" > "Realtime"');
            console.log('4. Make sure the tables you need are included in a publication');
            console.log('5. If not, create a new publication or update an existing one to include:');
            disabledTables.forEach(([table]) => {
                console.log(`   - ${table}`);
            });
        }

    } catch (error) {
        logger.error(error, 'Failed to check Realtime status');
        console.error('❌ Error checking Realtime status:', error);
    }
}

// Auto-run if executed directly
if (require.main === module) {
    checkAndPrintRealtimeStatus().catch(console.error);
}

export { checkAndPrintRealtimeStatus }; 