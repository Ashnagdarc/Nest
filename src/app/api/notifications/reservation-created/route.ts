import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendReservationCreatedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { gearIds, startDate, endDate, reason } = await request.json();

        if (!gearIds || !startDate || !endDate || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields' },
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

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, notification_preferences')
            .eq('id', user.id)
            .single();

        if (!profile?.email) {
            return NextResponse.json(
                { error: 'User email not found' },
                { status: 404 }
            );
        }

        // Check user notification preferences
        const prefs = profile.notification_preferences || {};
        const sendEmail = prefs.email?.reservations ?? true; // Default to true for reservations

        if (!sendEmail) {
            return NextResponse.json({
                success: true,
                message: 'Email notifications disabled for this user'
            });
        }

        // Get gear names for the email
        const { data: gears } = await supabase
            .from('gears')
            .select('name')
            .in('id', gearIds);

        const gearNames = gears?.map(g => g.name).join(', ') || 'equipment';

        // Send reservation created email to user
        const result = await sendReservationCreatedEmail({
            to: profile.email,
            userName: profile.full_name || 'there',
            gearName: gearNames,
            startDate,
            endDate,
            reason,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        // Also send notification emails to admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('email, full_name, notification_preferences')
            .eq('role', 'Admin')
            .eq('status', 'Active');

        if (admins && admins.length > 0) {
            for (const admin of admins) {
                if (!admin.email) continue;

                const adminPrefs = admin.notification_preferences || {};
                const sendAdminEmail = adminPrefs.email?.new_reservations ?? true;

                if (sendAdminEmail) {
                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-gear-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: admin.email,
                                subject: `📅 New Reservation: ${gearNames}`,
                                html: `
                                    <h2>New Calendar Reservation</h2>
                                    <p>Dear ${admin.full_name || 'Admin'},</p>
                                    <p><strong>${profile.full_name || 'A user'}</strong> has created a new calendar reservation:</p>
                                    <ul>
                                        <li><strong>Equipment:</strong> ${gearNames}</li>
                                        <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
                                        <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
                                        <li><strong>Reason:</strong> ${reason}</li>
                                    </ul>
                                    <p>Please review and approve/reject this reservation in the admin calendar.</p>
                                    <br/>
                                    <p>— Nest by Eden Oasis Team</p>
                                `,
                            }),
                        });
                    } catch (error) {
                        console.warn('Failed to send admin notification email:', error);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Reservation creation emails sent successfully'
        });

    } catch (error) {
        console.error('[Email Error] Reservation created:', error);
        return NextResponse.json(
            { error: 'Failed to send reservation creation emails' },
            { status: 500 }
        );
    }
}
