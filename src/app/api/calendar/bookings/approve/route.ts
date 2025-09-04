import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

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
                approved_at: new Date().toISOString(),
                checkout_date: new Date().toISOString(),
                due_date: booking.end_date
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

            // Get gear details to check quantity
            const { data: gearData, error: gearFetchError } = await supabase
                .from('gears')
                .select('id, name, quantity, available_quantity, status')
                .eq('id', booking.gear_id)
                .single();

            if (gearFetchError) {
                console.error('Error fetching gear details:', gearFetchError);
                // Log error for debugging
                await supabase.from('request_status_history').insert({
                    request_id: gearRequest.id,
                    status: 'ERROR',
                    changed_at: new Date().toISOString(),
                    note: `Failed to fetch gear details for calendar booking approval: ${gearFetchError.message}`
                });
            } else {
                // Check if gear is under maintenance or otherwise unavailable
                if (gearData.status === 'Under Repair') {
                    return NextResponse.json(
                        { error: 'This gear is currently under maintenance and cannot be booked.' },
                        { status: 400 }
                    );
                }

                // Check if gear is already fully booked for this period
                const { data: availabilityCheck, error: availabilityError } = await supabase.rpc('check_gear_availability', {
                    p_gear_id: booking.gear_id,
                    p_start_date: booking.start_date,
                    p_end_date: booking.end_date
                });

                if (availabilityError) {
                    console.error('Error checking gear availability:', availabilityError);
                } else if (availabilityCheck && !availabilityCheck.is_available) {
                    return NextResponse.json(
                        {
                            error: `This gear is not available for the requested period. 
                                   Available: ${availabilityCheck.available_quantity} of ${availabilityCheck.total_quantity} units. 
                                   Status: ${availabilityCheck.current_status}. 
                                   Conflicting bookings: ${availabilityCheck.conflicting_bookings}`
                        },
                        { status: 400 }
                    );
                }
                // Calculate new available quantity
                const currentQuantity = gearData.quantity || 1;
                const availableQuantity = gearData.available_quantity !== null ? gearData.available_quantity : currentQuantity;
                const newAvailableQuantity = Math.max(0, availableQuantity - 1);

                // Determine status based on available quantity
                const newStatus = newAvailableQuantity > 0 ? 'Partially Checked Out' : 'Checked Out';

                console.log(`Updating gear ${gearData.name} (${booking.gear_id}) from status ${gearData.status} to ${newStatus}`);

                // Update gear status and quantities using a direct SQL query to bypass any problematic triggers
                const { error: gearUpdateError } = await supabase.rpc('update_gear_checkout_status', {
                    p_gear_id: booking.gear_id,
                    p_status: newStatus,
                    p_checked_out_to: booking.user_id,
                    p_current_request_id: gearRequest.id,
                    p_last_checkout_date: new Date().toISOString(),
                    p_due_date: booking.end_date,
                    p_available_quantity: newAvailableQuantity
                });

                if (gearUpdateError) {
                    console.error('Error updating gear status:', gearUpdateError);
                    // Log error for debugging
                    await supabase.from('request_status_history').insert({
                        request_id: gearRequest.id,
                        status: 'ERROR',
                        changed_at: new Date().toISOString(),
                        note: `Failed to update gear status for calendar booking approval: ${gearUpdateError.message}`
                    });
                } else {
                    // Log successful status change
                    await supabase.from('request_status_history').insert({
                        request_id: gearRequest.id,
                        status: newStatus,
                        changed_at: new Date().toISOString(),
                        note: `Gear status updated from ${gearData.status} to ${newStatus} via calendar booking approval`
                    });
                }
            }
        }

        // Send notification to user about approval using admin client
        const adminClient = await createSupabaseAdminClient();
        await adminClient
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

        // Send notification to user about rejection using admin client
        const adminClient = await createSupabaseAdminClient();
        await adminClient
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
