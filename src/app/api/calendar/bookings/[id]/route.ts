import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createSupabaseServerClient();
        const bookingId = params.id;

        if (!bookingId) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the booking details to verify ownership
        const { data: booking, error: bookingError } = await supabase
            .from('gear_calendar_bookings')
            .select(`
                *,
                gears(id, name, category),
                profiles(id, full_name, email)
            `)
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Check if user owns this booking or is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'Admin';
        const isOwner = booking.user_id === user.id;

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { error: 'You can only cancel your own reservations' },
                { status: 403 }
            );
        }

        // Only allow cancellation of pending bookings
        if (booking.status !== 'Pending') {
            return NextResponse.json(
                { error: `Cannot cancel ${booking.status.toLowerCase()} reservation` },
                { status: 400 }
            );
        }

        // Delete the booking
        const { error: deleteError } = await supabase
            .from('gear_calendar_bookings')
            .delete()
            .eq('id', bookingId);

        if (deleteError) {
            console.error('Error deleting booking:', deleteError);
            return NextResponse.json(
                { error: 'Failed to cancel reservation' },
                { status: 500 }
            );
        }

        // Send notification to user (if admin cancelled) or admins (if user cancelled)
        if (isAdmin && !isOwner) {
            // Admin cancelled user's reservation
            await supabase
                .from('notifications')
                .insert({
                    user_id: booking.user_id,
                    type: 'booking_cancelled',
                    title: 'Reservation Cancelled',
                    message: `Your reservation for ${booking.gears?.name || 'gear'} has been cancelled by an administrator.`,
                    is_read: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    metadata: {
                        bookingId: bookingId,
                        gearName: booking.gears?.name,
                        cancelledBy: 'admin'
                    }
                });

            // Send cancellation email to user (admin cancelled)
            try {
                const { sendReservationCancelledEmail } = await import('@/lib/email');
                await sendReservationCancelledEmail({
                    to: booking.profiles?.email || '',
                    userName: booking.profiles?.full_name || 'there',
                    gearName: booking.gears?.name || 'equipment',
                    startDate: booking.start_date,
                    endDate: booking.end_date,
                    cancelledBy: 'admin'
                });
            } catch (emailError) {
                console.warn('Failed to send admin cancellation email:', emailError);
            }
        } else if (isOwner) {
            // User cancelled their own reservation - notify admins
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            if (admins && admins.length > 0) {
                const adminNotifications = admins.map(admin => ({
                    user_id: admin.id,
                    type: 'booking_cancelled',
                    title: 'Reservation Cancelled',
                    message: `${booking.profiles?.full_name || 'A user'} has cancelled their reservation for ${booking.gears?.name || 'gear'}.`,
                    is_read: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    metadata: {
                        bookingId: bookingId,
                        gearName: booking.gears?.name,
                        cancelledBy: 'user',
                        userId: booking.user_id
                    }
                }));

                await supabase
                    .from('notifications')
                    .insert(adminNotifications);
            }

            // Send cancellation email to user (user cancelled)
            if (booking.profiles?.email) {
                try {
                    const { sendReservationCancelledEmail } = await import('@/lib/email');
                    await sendReservationCancelledEmail({
                        to: booking.profiles.email,
                        userName: booking.profiles.full_name || 'there',
                        gearName: booking.gears?.name || 'equipment',
                        startDate: booking.start_date,
                        endDate: booking.end_date,
                        cancelledBy: 'user'
                    });
                } catch (emailError) {
                    console.warn('Failed to send user cancellation email:', emailError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Reservation cancelled successfully'
        });

    } catch (error) {
        console.error('Error in booking cancellation:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
