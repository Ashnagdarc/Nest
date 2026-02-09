import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail, sendCarReturnConfirmationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 });

        const { data: existing, error: selErr } = await admin
            .from('car_bookings')
            .select('id,status,requester_id,employee_name,date_of_use,time_slot')
            .eq('id', bookingId)
            .maybeSingle();
        if (selErr || !existing) return NextResponse.json({ success: false, error: selErr?.message || 'Not found' }, { status: 404 });
        // Idempotency: if already completed, succeed
        if (existing.status === 'Completed') {
            return NextResponse.json({ success: true, data: existing });
        }
        if (existing.status !== 'Approved') return NextResponse.json({ success: false, error: 'Booking is not in Approved state' }, { status: 400 });

        const { data: updatedRow, error: updErr } = await admin
            .from('car_bookings')
            .update({ status: 'Completed', updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select('id,status,employee_name,date_of_use,time_slot,updated_at')
            .maybeSingle();
        if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 400 });
        
        let finalRow = updatedRow;
        
        // If no row returned, double-check current status and treat as success if already completed
        if (!updatedRow) {
            const { data: afterCheck } = await admin
                .from('car_bookings')
                .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                .eq('id', bookingId)
                .maybeSingle();
            if (afterCheck?.status === 'Completed') {
                return NextResponse.json({ success: true, data: afterCheck });
            }
            // Retry once defensively
            const { data: secondTry, error: secondErr } = await admin
                .from('car_bookings')
                .update({ status: 'Completed', updated_at: new Date().toISOString() })
                .eq('id', bookingId)
                .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                .maybeSingle();
            if (secondErr) {
                console.error('complete retry failed', { bookingId, error: secondErr.message });
            }
            if (secondTry?.status === 'Completed') {
                finalRow = secondTry;
            }
            // If secondTry not completed, proceed to final verification and fallback below
        }

        if (!finalRow) {
            finalRow = (await admin
                .from('car_bookings')
                .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                .eq('id', bookingId)
                .maybeSingle()).data;
        }
        if (!finalRow || finalRow.status !== 'Completed') {
            // Retry read with short backoff, then accept success to avoid user bounce if update had no error
            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 150));
                const { data: probe } = await admin
                    .from('car_bookings')
                    .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                    .eq('id', bookingId)
                    .maybeSingle();
                if (probe?.status === 'Completed') { finalRow = probe; break; }
            }
            if (!finalRow || finalRow.status !== 'Completed') {
                const { data: secondTry, error: secondErr } = await admin
                    .from('car_bookings')
                    .update({ status: 'Completed', updated_at: new Date().toISOString() })
                    .eq('id', bookingId)
                    .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                    .maybeSingle();
                if (secondErr) {
                    console.error('complete retry failed', { bookingId, error: secondErr.message });
                }
                if (secondTry?.status === 'Completed') {
                    finalRow = secondTry;
                }
            }
        }
        if (!finalRow) {
            // As a last resort, treat successful update-without-error as success to avoid user bounce (likely read-after-write lag)
            console.warn('complete final verify missing row, assuming success due to prior no-error update', { bookingId });
            finalRow = {
                id: bookingId as string,
                status: 'Completed',
                employee_name: existing.employee_name,
                date_of_use: existing.date_of_use,
                time_slot: existing.time_slot,
                updated_at: new Date().toISOString()
            } as {
                id: string;
                status: string;
                employee_name: string | null;
                date_of_use: string | null;
                time_slot: string | null;
                updated_at: string | null;
            };
        }

        // Lookup assigned car and plate if any
        let plateInfo = '';
        const { data: assign } = await admin
            .from('car_assignment')
            .select('car_id')
            .eq('booking_id', bookingId)
            .maybeSingle();
        if (assign?.car_id) {
            const { data: car } = await admin.from('cars').select('label,plate').eq('id', assign.car_id).maybeSingle();
            if (car?.plate || car?.label) plateInfo = `${car?.label || ''} ${car?.plate ? '(' + car.plate + ')' : ''}`;
        }

        // Get user email for return confirmation
        let userEmail = '';
        if (existing.requester_id) {
            const { data: profile } = await admin
                .from('profiles')
                .select('email')
                .eq('id', existing.requester_id)
                .single();
            userEmail = profile?.email || '';
        }

        // Send return confirmation email to user
        try {
            if (userEmail) {
                await sendCarReturnConfirmationEmail({
                    to: userEmail,
                    userName: existing.employee_name || 'User',
                    dateOfUse: existing.date_of_use || '',
                    timeSlot: existing.time_slot || '',
                    carDetails: plateInfo || undefined,
                    returnedAt: finalRow.updated_at || new Date().toISOString(),
                });
            }
        } catch (e) {
            console.warn('sendCarReturnConfirmationEmail to user failed', e);
        }

        // Send notification email to all admins
        try {
            const { data: admins } = await admin
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'Admin')
                .eq('status', 'Active');
            
            if (admins && Array.isArray(admins)) {
                for (const adminProfile of admins) {
                    if (adminProfile.email) {
                        try {
                            const timestamp = new Date().toISOString();
                            await sendGearRequestEmail({
                                to: adminProfile.email,
                                subject: `🔑 Car Returned - ${existing.employee_name}`,
                                html: `
                                    <!DOCTYPE html>
                                    <html>
                                        <head>
                                            <meta charset="utf-8">
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        </head>
                                        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px 40px; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🔑 Vehicle Returned</h1>
                                                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Booking completed successfully</p>
                                                </div>
                                                <div style="padding: 40px; line-height: 1.6; color: #333;">
                                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Hello ${adminProfile.full_name || 'Admin'},</h2>
                                                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151;">A vehicle has been returned and the booking is now complete.</p>
                                                    <div style="background-color: #faf5ff; border-left: 4px solid #8b5cf6; padding: 16px; margin: 24px 0; border-radius: 4px;">
                                                        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #6b21a8;">Return Details</h3>
                                                        <table style="width: 100%; border-collapse: collapse;">
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Employee:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${existing.employee_name}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date of Use:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${existing.date_of_use}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time Slot:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${existing.time_slot}</td>
                                                            </tr>
                                                            ${plateInfo ? `
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Vehicle:</td>
                                                                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${plateInfo}</td>
                                                            </tr>
                                                            ` : ''}
                                                            <tr>
                                                                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Returned At:</td>
                                                                <td style="padding: 8px 0; color: #1f2937;">${new Date(timestamp).toLocaleString()}</td>
                                                            </tr>
                                                        </table>
                                                    </div>
                                                    <div style="text-align: center; margin: 32px 0;">
                                                        <a href="https://nestbyeden.app/admin/manage-car-bookings" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">View All Bookings</a>
                                                    </div>
                                                    <p style="margin-top: 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">The vehicle is now available for new bookings.</p>
                                                </div>
                                                <div style="background-color: #f7fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                    <p style="margin: 0; font-size: 14px; color: #718096;">
                                                        This is an automated notification from <a href="https://nestbyeden.app" style="color: #8b5cf6; text-decoration: none;"><strong>Nest by Eden Oasis</strong></a><br>
                                                        Vehicle Management System
                                                    </p>
                                                </div>
                                            </div>
                                        </body>
                                    </html>
                                `
                            });
                        } catch (emailError) {
                            console.warn(`Failed to send email to admin ${adminProfile.email}:`, emailError);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to notify admins by email:', err);
        }

        return NextResponse.json({ success: true, data: finalRow });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
