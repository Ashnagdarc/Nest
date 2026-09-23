import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendGearRequestEmail } from '@/lib/email';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { sitePath } from '@/lib/site-url';
import { hasValidCronSecret } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseAdminClient();
    const now = new Date();

    try {
        // Due time and who to tell live on the booking, not on the shared gear row.
        const { data: overdueRequests, error } = await supabase
            .from('gear_requests')
            .select(`
                user_id,
                submitted_by_user_id,
                due_date,
                gear_request_gears (
                    quantity,
                    gears (name)
                )
            `)
            .in('status', ['Approved', 'Checked Out', 'Partially Checked Out', 'Overdue'])
            .not('due_date', 'is', null)
            .lt('due_date', now.toISOString());

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!overdueRequests || overdueRequests.length === 0) {
            return NextResponse.json({ message: 'No overdue gear found.' });
        }

        const userGearMap: Record<string, { userId: string; gearNames: string[]; dueDates: string[] }> = {};
        for (const request of overdueRequests as Array<{
            user_id: string;
            submitted_by_user_id: string | null;
            due_date: string;
            gear_request_gears: Array<{
                quantity: number | null;
                gears: { name: string | null } | Array<{ name: string | null }> | null;
            }> | null;
        }>) {
            const recipientIds = [request.user_id, request.submitted_by_user_id].filter(
                (id): id is string => Boolean(id)
            );
            const labels = (request.gear_request_gears || []).map((line) => {
                const gear = Array.isArray(line.gears) ? line.gears[0] : line.gears;
                const quantity = Math.max(1, Number(line.quantity ?? 1));
                return `${gear?.name || 'Equipment'} (x${quantity})`;
            });
            for (const recipientId of recipientIds) {
                if (!userGearMap[recipientId]) {
                    userGearMap[recipientId] = { userId: recipientId, gearNames: [], dueDates: [] };
                }
                for (const label of labels) {
                    userGearMap[recipientId].gearNames.push(label);
                    userGearMap[recipientId].dueDates.push(request.due_date);
                }
            }
        }

        for (const userId of Object.keys(userGearMap)) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', userId)
                .single();
            if (!userProfile) continue;

            const dueDates = userGearMap[userId].dueDates.map((d) => new Date(d));
            const earliestDue = dueDates.reduce((a, b) => (a < b ? a : b));
            const overdueDays = Math.floor((now.getTime() - earliestDue.getTime()) / (1000 * 60 * 60 * 24));
            const dayStamp = earliestDue.toISOString().split('T')[0];

            // Idempotency check for the same overdue day stamp.
            const { data: existingNotifications } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('type', 'Overdue')
                .gte('created_at', `${dayStamp}T00:00:00.000Z`)
                .lt('created_at', `${dayStamp}T23:59:59.999Z`)
                .limit(1);
            if (existingNotifications && existingNotifications.length > 0) {
                continue;
            }

            if (userProfile.email) {
                await sendGearRequestEmail({
                    to: userProfile.email,
                    subject: `Overdue Gear Notice: ${userGearMap[userId].gearNames.join(', ')}`,
                    html: `
                        <h2>Overdue Gear Notice</h2>
                        <p>Dear ${userProfile.full_name},</p>
                        <p>The following gear is overdue for return:</p>
                        <ul>
                            ${userGearMap[userId].gearNames.map(name => `<li>${name}</li>`).join('')}
                        </ul>
                        <p>Earliest due date: <b>${earliestDue.toLocaleDateString()}</b> (${overdueDays} days overdue)</p>
                        <p>Please return your gear as soon as possible to avoid penalties.</p>
                        <br/>
                        <p>— Nest by Eden Oasis Team</p>
                    `,
                });
            }

            await notifyGoogleChat(NotificationEventType.GEAR_OVERDUE, {
                userName: userProfile.full_name,
                userEmail: userProfile.email,
                gearNames: userGearMap[userId].gearNames,
                dueDate: earliestDue,
                overdueDays,
            });

            try {
                await fetch(sitePath('/api/notifications/overdue-reminder'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        gearList: userGearMap[userId].gearNames.map((name: string, index: number) => ({
                            name,
                            dueDate: userGearMap[userId].dueDates[index] || earliestDue.toISOString()
                        })),
                        dueDate: earliestDue.toISOString(),
                        overdueDays,
                    }),
                });
            } catch (notifyError) {
                console.error('Error sending overdue reminder email:', notifyError);
            }

            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');

            if (admins && Array.isArray(admins)) {
                for (const admin of admins) {
                    if (!admin.email) continue;
                    await sendGearRequestEmail({
                        to: admin.email,
                        subject: `Overdue Gear Alert: ${userProfile.full_name}`,
                        html: `
                            <h2>Overdue Gear Alert</h2>
                            <p>User <b>${userProfile.full_name}</b> (${userProfile.email}) has overdue gear:</p>
                            <ul>
                                ${userGearMap[userId].gearNames.map(name => `<li>${name}</li>`).join('')}
                            </ul>
                            <p>Earliest due date: <b>${earliestDue.toLocaleDateString()}</b> (${overdueDays} days overdue)</p>
                            <p>Please follow up as needed.</p>
                            <br/>
                            <p>— Nest by Eden Oasis System</p>
                        `,
                    });
                }
            }

            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'Overdue',
                title: 'Overdue Gear Notification',
                message: `Overdue gear: ${userGearMap[userId].gearNames.join(', ')}`,
                is_read: false,
                category: 'System',
            });
        }

        return NextResponse.json({ message: 'Overdue notifications sent.' });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
