import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { booking_id, admin_notes } = await request.json();

        if (!booking_id) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        // Get current user (admin)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Get the booking details
        const { data: booking, error: bookingError } = await supabase
            .from('gear_calendar_bookings')
            .select(`
                *,
                gears(id, name, category),
                profiles(id, full_name, email)
            `)
            .eq('id', booking_id)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Update booking status to approved
        const { data: updatedBooking, error: updateError } = await supabase
            .from('gear_calendar_bookings')
            .update({
                status: 'Approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                notes: admin_notes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', booking_id)
            .select()
            .single();

        if (updateError) {
            console.error('Error approving booking:', updateError);
            return NextResponse.json(
                { error: 'Failed to approve booking' },
                { status: 500 }
            );
        }

        // Create gear request for check-in system (only after approval)
        const { data: gearRequest, error: requestError } = await supabase
            .from('gear_requests')
            .insert({
                user_id: booking.user_id,
                gear_ids: [booking.gear_id],
                reason: booking.reason,
                expected_duration: 'Calendar booking',
                status: 'Approved',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                approved_at: new Date().toISOString()
            })
            .select()
            .single();

        if (!requestError && gearRequest) {
            // Create gear request line
            await supabase
                .from('gear_request_gears')
                .insert({
                    gear_request_id: gearRequest.id,
                    gear_id: booking.gear_id,
                    quantity: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            // Link the booking to the gear request
            await supabase
                .from('gear_calendar_bookings')
                .update({ request_id: gearRequest.id })
                .eq('id', booking_id);
        }

        // Send notification to user about approval
        await supabase
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                type: 'booking_approved',
                title: 'Reservation Approved',
                message: `Your reservation for ${booking.gears?.name || 'gear'} has been approved and is now available for check-out.`,
                is_read: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                    bookingId: booking_id,
                    gearName: booking.gears?.name,
                    adminNotes: admin_notes
                }
            });

        // Send approval email to user
        if (booking.profiles?.email) {
            try {
                const { sendReservationApprovedEmail } = await import('@/lib/email');
                await sendReservationApprovedEmail({
                    to: booking.profiles.email,
                    userName: booking.profiles.full_name || 'there',
                    gearName: booking.gears?.name || 'equipment',
                    startDate: booking.start_date,
                    endDate: booking.end_date,
                    adminNotes: admin_notes
                });
            } catch (emailError) {
                console.warn('Failed to send approval email:', emailError);
            }
        }

        return NextResponse.json({
            success: true,
            booking: updatedBooking,
            message: 'Booking approved successfully'
        });

    } catch (error) {
        console.error('Error in booking approval:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { booking_id, admin_notes } = await request.json();

        if (!booking_id) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        // Get current user (admin)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'Admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Get the booking details
        const { data: booking, error: bookingError } = await supabase
            .from('gear_calendar_bookings')
            .select(`
                *,
                gears(id, name, category),
                profiles(id, full_name, email)
            `)
            .eq('id', booking_id)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Update booking status to rejected
        const { data: updatedBooking, error: updateError } = await supabase
            .from('gear_calendar_bookings')
            .update({
                status: 'Rejected',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                notes: admin_notes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', booking_id)
            .select()
            .single();

        if (updateError) {
            console.error('Error rejecting booking:', updateError);
            return NextResponse.json(
                { error: 'Failed to reject booking' },
                { status: 500 }
            );
        }

        // Send notification to user about rejection
        await supabase
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                type: 'booking_rejected',
                title: 'Reservation Rejected',
                message: `Your reservation for ${booking.gears?.name || 'gear'} has been rejected. ${admin_notes ? 'Reason: ' + admin_notes : ''}`,
                is_read: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                    bookingId: booking_id,
                    gearName: booking.gears?.name,
                    adminNotes: admin_notes
                }
            });

        // Send rejection email to user
        if (booking.profiles?.email) {
            try {
                const { sendReservationRejectedEmail } = await import('@/lib/email');
                await sendReservationRejectedEmail({
                    to: booking.profiles.email,
                    userName: booking.profiles.full_name || 'there',
                    gearName: booking.gears?.name || 'equipment',
                    startDate: booking.start_date,
                    endDate: booking.end_date,
                    reason: admin_notes
                });
            } catch (emailError) {
                console.warn('Failed to send rejection email:', emailError);
            }
        }

        return NextResponse.json({
            success: true,
            booking: updatedBooking,
            message: 'Booking rejected successfully'
        });

    } catch (error) {
        console.error('Error in booking rejection:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
