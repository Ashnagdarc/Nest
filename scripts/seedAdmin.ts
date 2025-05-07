import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Set your admin credentials here
const adminEmail = 'adira@edenoasisrealty.com';
const adminPassword = 'Edenoasis123';
const adminFullName = 'Admin User';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAdmin() {
    try {
        // 1. Create the admin user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: adminEmail,
            password: adminPassword,
            options: {
                emailRedirectTo: '', // No redirect needed for seeding
            },
        });
        if (signUpError && !signUpError.message.includes('User already registered')) {
            throw signUpError;
        }
        const userId = signUpData?.user?.id;
        if (!userId) {
            // If user already exists, fetch their ID
            const { data: userData, error: userFetchError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', adminEmail)
                .maybeSingle();
            if (userFetchError || !userData) {
                throw userFetchError || new Error('Could not fetch existing admin user ID');
            }
            // Use the existing user ID
            await insertProfile(userData.id);
        } else {
            // 2. Insert the profile for the new user
            await insertProfile(userId);
        }
        console.log('Admin user and profile seeded successfully.');
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
}

async function insertProfile(userId: string) {
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: adminEmail,
        full_name: adminFullName,
        role: 'Admin',
        status: 'Active',
    });
    if (profileError) throw profileError;
}

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

seedAdmin(); 