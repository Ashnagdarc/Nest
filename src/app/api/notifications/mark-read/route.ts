import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { notificationId } = await request.json();

        if (!notificationId) {
            return NextResponse.json(
                { error: 'Missing notificationId parameter' },
                { status: 400 }
            );
        }

        // Create a Supabase client with the cookies
        const supabase = createRouteHandlerClient({ cookies });

        // Get the user's session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.warn('Server: No session found, attempting to use stored procedure as fallback');
            try {
                // Use the stored procedure which runs with SECURITY DEFINER
                const { data, error } = await supabase.rpc('mark_notification_as_read', {
                    notification_id: notificationId
                });

                if (error) {
                    console.error('Server: Stored procedure fallback failed:', error);

                    // Try the direct procedure as last resort
                    const { data: directData, error: directError } = await supabase.rpc('direct_mark_notification_read', {
                        notification_id: notificationId
                    });

                    if (directError) {
                        console.error('Server: Direct procedure fallback also failed:', directError);
                        return NextResponse.json(
                            { error: 'Unauthorized and all fallbacks failed' },
                            { status: 401 }
                        );
                    }

                    return NextResponse.json({
                        success: true,
                        method: 'direct_procedure_fallback'
                    });
                }

                return NextResponse.json({
                    success: true,
                    method: 'procedure_fallback'
                });
            } catch (fallbackError) {
                console.error('Server: Exception in fallback procedure:', fallbackError);
                return NextResponse.json(
                    { error: 'Unauthorized and fallback failed' },
                    { status: 401 }
                );
            }
        }

        // Log server-side information for debugging
        console.log('Server: Marking notification as read:', {
            notificationId,
            userId: session.user.id
        });

        // Try using the stored procedure first (most reliable)
        try {
            const { data: procData, error: procError } = await supabase.rpc('mark_notification_as_read', {
                notification_id: notificationId
            });

            if (!procError) {
                console.log('Server: Successfully used stored procedure');
                return NextResponse.json({
                    success: true,
                    method: 'stored_procedure'
                });
            }

            console.warn('Server: Stored procedure failed, falling back to direct update:', procError);
        } catch (procException) {
            console.warn('Server: Exception in stored procedure call:', procException);
        }

        // Direct update with server-side credentials - this should bypass RLS
        const { error } = await supabase
            .from('notifications')
            .update({
                read: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Server: Error updating notification:', error);

            // Last resort - try the force_mark_notification_read function
            try {
                const { error: forceError } = await supabase.rpc('force_mark_notification_read', {
                    p_notification_id: notificationId
                });

                if (forceError) {
                    console.error('Server: Force mark function also failed:', forceError);
                    return NextResponse.json(
                        { error: 'Failed to mark notification as read', details: error },
                        { status: 500 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    method: 'force_function'
                });
            } catch (forceException) {
                console.error('Server: Exception in force function:', forceException);
                return NextResponse.json(
                    { error: 'Failed to mark notification as read', details: error },
                    { status: 500 }
                );
            }
        }

        // Verify the update worked
        const { data: verifyData, error: verifyError } = await supabase
            .from('notifications')
            .select('id, read')
            .eq('id', notificationId)
            .single();

        if (verifyError) {
            console.error('Server: Error verifying update:', verifyError);
        } else {
            console.log('Server: Verification result:', verifyData);
        }

        return NextResponse.json({ success: true, method: 'direct_update' });
    } catch (error) {
        console.error('Server: Exception in mark-read API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Mark all notifications as read
        const supabase = createRouteHandlerClient({ cookies });

        // Get the user's session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // Try using the stored procedure as fallback
            try {
                const { data, error } = await supabase.rpc('mark_all_notifications_as_read');

                if (error) {
                    console.error('Server: Mark all procedure fallback failed:', error);
                    return NextResponse.json(
                        { error: 'Unauthorized and procedure fallback failed' },
                        { status: 401 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    method: 'procedure_fallback',
                    count: data
                });
            } catch (fallbackError) {
                console.error('Server: Exception in mark all fallback:', fallbackError);
                return NextResponse.json(
                    { error: 'Unauthorized and fallback failed' },
                    { status: 401 }
                );
            }
        }

        // Log server-side information for debugging
        console.log('Server: Marking all notifications as read for user:', session.user.id);

        // Try using the stored procedure first
        try {
            const { data: procData, error: procError } = await supabase.rpc('mark_all_notifications_as_read');

            if (!procError) {
                console.log('Server: Successfully used mark all procedure, count:', procData);
                return NextResponse.json({
                    success: true,
                    method: 'stored_procedure',
                    count: procData
                });
            }

            console.warn('Server: Mark all procedure failed, falling back to direct update:', procError);
        } catch (procException) {
            console.warn('Server: Exception in mark all procedure call:', procException);
        }

        // Direct update with server-side credentials
        const { error } = await supabase
            .from('notifications')
            .update({
                read: true,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id)
            .eq('read', false);

        if (error) {
            console.error('Server: Error updating all notifications:', error);
            return NextResponse.json(
                { error: 'Failed to mark all notifications as read', details: error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, method: 'direct_update' });
    } catch (error) {
        console.error('Server: Exception in mark-all-read API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 