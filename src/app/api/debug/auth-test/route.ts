import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    console.log('[Auth Debug] Starting comprehensive auth test...');
    
    try {
        // Test 1: Environment variables
        console.log('[Auth Debug] Checking environment variables...');
        const envCheck = {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) || 'missing',
        };
        
        // Test 2: Cookie access
        console.log('[Auth Debug] Checking cookie access...');
        let cookieCheck = { success: false, error: '', cookieCount: 0 };
        try {
            const cookieStore = await cookies();
            const allCookies = cookieStore.getAll();
            cookieCheck = {
                success: true,
                error: '',
                cookieCount: allCookies.length
            };
            console.log('[Auth Debug] Found cookies:', allCookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`));
        } catch (err: any) {
            cookieCheck = {
                success: false,
                error: err.message,
                cookieCount: 0
            };
        }
        
        // Test 3: Supabase client creation
        console.log('[Auth Debug] Creating Supabase client...');
        const clientStart = Date.now();
        const supabase = await createSupabaseServerClient();
        const clientTime = Date.now() - clientStart;
        
        // Test 4: Auth check with timeout handling
        console.log('[Auth Debug] Checking authentication...');
        const authStart = Date.now();
        
        // Add a timeout wrapper
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout after 15 seconds')), 15000)
        );
        
        let authResult: any;
        let authError: any;
        
        try {
            const result = await Promise.race([authPromise, timeoutPromise]);
            authResult = result;
        } catch (err) {
            authError = err;
        }
        
        const authTime = Date.now() - authStart;
        
        // Test 5: Session check
        console.log('[Auth Debug] Checking session...');
        const sessionStart = Date.now();
        let sessionResult: any;
        let sessionError: any;
        
        try {
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Session timeout after 15 seconds')), 15000)
            );
            sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise]);
        } catch (err) {
            sessionError = err;
        }
        
        const sessionTime = Date.now() - sessionStart;
        const totalTime = Date.now() - startTime;
        
        console.log('[Auth Debug] Test completed in', totalTime, 'ms');
        
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            timing: {
                total: totalTime,
                client_creation: clientTime,
                auth_check: authTime,
                session_check: sessionTime
            },
            tests: {
                environment: envCheck,
                cookies: cookieCheck,
                auth: {
                    success: !!authResult && !authError,
                    hasUser: !!authResult?.data?.user,
                    userId: authResult?.data?.user?.id || null,
                    error: authError?.message || authResult?.error?.message || null,
                    time: authTime
                },
                session: {
                    success: !!sessionResult && !sessionError,
                    hasSession: !!sessionResult?.data?.session,
                    error: sessionError?.message || sessionResult?.error?.message || null,
                    time: sessionTime
                }
            }
        });
        
    } catch (error: any) {
        const totalTime = Date.now() - startTime;
        console.error('[Auth Debug] Unexpected error:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Debug test failed',
            message: error.message,
            timing: {
                total: totalTime
            }
        }, { status: 500 });
    }
}