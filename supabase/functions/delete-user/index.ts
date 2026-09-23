import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (req.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Verify caller JWT (do not trust body alone)
        const supabaseCaller = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false },
        })
        const { data: { user: caller }, error: callerError } = await supabaseCaller.auth.getUser()
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
        })

        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, status')
            .eq('id', caller.id)
            .maybeSingle()

        if (
            profileError ||
            callerProfile?.role !== 'Admin' ||
            callerProfile?.status !== 'Active'
        ) {
            return new Response(
                JSON.stringify({ error: 'Forbidden: Active admin required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { userId } = await req.json()

        if (!userId || typeof userId !== 'string') {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Refuse self-wipe via this endpoint (use a dedicated break-glass path if needed)
        if (userId === caller.id) {
            return new Response(
                JSON.stringify({ error: 'Cannot delete your own account via this function' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Destructive cascade RPC — only after Active Admin authz above.
        // NOTE (DB readiness): delete_user_cascade is NOT defined in any
        // supabase/migrations/*.sql (including series 20260923140*). Confirm the
        // RPC already exists on the target project and is EXECUTE-revoked from
        // anon/authenticated before relying on this function. Do NOT invent a
        // cascade wipe RPC in-repo as part of hardening; treat missing RPC as
        // a separate ops/schema follow-up.
        const { error: deleteError } = await supabaseAdmin.rpc('delete_user_cascade', {
            p_user_id: userId,
        })

        if (deleteError) {
            throw deleteError
        }

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
            throw authError
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
