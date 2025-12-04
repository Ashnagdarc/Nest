import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    const startTime = Date.now();
    
    const results = {
        timestamp: new Date().toISOString(),
        services: {} as Record<string, any>,
        overall_status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
    };
    
    // Test 1: Environment Variables
    try {
        results.services.environment = {
            status: 'healthy',
            checks: {
                supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                resend_key: !!process.env.RESEND_API_KEY,
            },
            url_prefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) || 'missing'
        };
    } catch (error: any) {
        results.services.environment = {
            status: 'unhealthy',
            error: error.message
        };
    }
    
    // Test 2: Supabase Connectivity
    try {
        const supabase = await createSupabaseServerClient();
        const authStart = Date.now();
        
        // Simple connectivity test
        const { data, error } = await Promise.race([
            supabase.from('profiles').select('count').limit(1),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
            )
        ]) as any;
        
        const authTime = Date.now() - authStart;
        
        if (error && !error.message?.includes('permission denied')) {
            throw error;
        }
        
        results.services.supabase = {
            status: 'healthy',
            response_time: authTime,
            accessible: true
        };
    } catch (error: any) {
        const authTime = Date.now() - startTime;
        results.services.supabase = {
            status: 'unhealthy',
            error: error.message,
            response_time: authTime,
            accessible: false
        };
    }
    
    // Test 3: Network Connectivity (basic)
    try {
        const netStart = Date.now();
        const response = await Promise.race([
            fetch('https://www.google.com', { 
                method: 'HEAD',
                signal: AbortSignal.timeout(3000)
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Network timeout')), 3000)
            )
        ]) as Response;
        
        const netTime = Date.now() - netStart;
        
        results.services.network = {
            status: response.ok ? 'healthy' : 'degraded',
            response_time: netTime,
            external_connectivity: response.ok
        };
    } catch (error: any) {
        results.services.network = {
            status: 'unhealthy',
            error: error.message,
            external_connectivity: false
        };
    }
    
    // Determine overall status
    const serviceStatuses = Object.values(results.services).map(s => s.status);
    if (serviceStatuses.every(s => s === 'healthy')) {
        results.overall_status = 'healthy';
    } else if (serviceStatuses.some(s => s === 'unhealthy')) {
        results.overall_status = 'unhealthy';
    } else {
        results.overall_status = 'degraded';
    }
    
    const totalTime = Date.now() - startTime;
    
    const status = results.overall_status === 'healthy' ? 200 :
                  results.overall_status === 'degraded' ? 207 : 503;
    
    return NextResponse.json({
        ...results,
        total_check_time: totalTime
    }, { status });
}