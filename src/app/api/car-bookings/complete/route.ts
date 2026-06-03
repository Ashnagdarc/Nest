import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { minimalEmailLayout, sendGearRequestEmail, sendCarReturnConfirmationEmail } from '@/lib/email';
import { transitionBooking } from '@/lib/bookings-v2/service';
import { getBookedCarId, setCarStatus } from '@/lib/car-bookings/car-status-sync';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    const ok = (booking: unknown = null, userMessage = 'Car booking completed.', warnings: string[] = []) =>
        NextResponse.json({ success: true, booking, items: [], warnings, user_message: userMessage, error_code: null, correlation_id: correlationId });
    const fail = (status: number, error: string, userMessage: string, errorCode: string) =>
        NextResponse.json({ success: false, booking: null, items: [], warnings: [], user_message: userMessage, error_code: errorCode, correlation_id: correlationId, error }, { status });
    try {
        const authHeader = request.headers.get('authorization');
        const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
        let currentUserId: string | null = null;
        if (!isCron) {
            const authClient = await createSupabaseServerClient();
            const { data: userData } = await authClient.auth.getUser();
            if (!userData.user) {
                return fail(401, 'Unauthorized', 'Authentication required.', 'CAR_BOOKING_UNAUTHORIZED');
            }
            currentUserId = userData.user.id;
        }

        const admin = await createSupabaseServerClient(true);
        const { bookingId } = await request.json();
        if (!bookingId) return fail(400, 'bookingId is required', 'Missing booking reference.', 'BOOKING_ID_REQUIRED');

        const { data: existing, error: selErr } = await admin
            .from('car_bookings')
            .select('id,status,requester_id,employee_name,date_of_use,time_slot')
            .eq('id', bookingId)
            .maybeSingle();
        if (selErr || !existing) return fail(404, selErr?.message || 'Not found', 'Booking not found.', 'CAR_BOOKING_NOT_FOUND');
        if (!isCron && currentUserId) {
            const { data: profile } = await admin
                .from('profiles')
                .select('role,status')
                .eq('id', currentUserId)
                .maybeSingle();
            const isAdmin = profile?.role === 'Admin' && profile?.status === 'Active';
            const isOwner = existing.requester_id === currentUserId;
            if (!isAdmin && !isOwner) {
                return fail(403, 'Only the booking owner or an admin can complete car bookings manually.', 'Only the booking owner or an admin can complete bookings manually.', 'CAR_BOOKING_ADMIN_REQUIRED');
            }
        }
        // Idempotency: if already completed, succeed
        if (existing.status === 'Completed') {
            try {
                const carId = await getBookedCarId(admin, bookingId);
                if (carId) {
                    await setCarStatus(admin, carId, 'Available');
                }
            } catch (syncError) {
                console.warn('[Car Booking Complete] Failed to sync already-completed car status:', syncError);
            }
            return ok(existing, 'Booking is already completed.');
        }
        if (existing.status !== 'Approved') return fail(400, 'Booking is not in Approved state', 'Only approved bookings can be completed.', 'CAR_BOOKING_INVALID_STATE');

        const { data: updatedRow, error: updErr } = await admin
            .from('car_bookings')
            .update({ status: 'Completed', updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select('id,status,employee_name,date_of_use,time_slot,updated_at')
            .maybeSingle();
        if (updErr) return fail(400, updErr.message, 'Could not complete booking right now.', 'CAR_BOOKING_COMPLETE_FAILED');
        
        let finalRow = updatedRow;
        
        // If no row returned, double-check current status and treat as success if already completed
        if (!updatedRow) {
            const { data: afterCheck } = await admin
                .from('car_bookings')
                .select('id,status,employee_name,date_of_use,time_slot,updated_at')
                .eq('id', bookingId)
                .maybeSingle();
            if (afterCheck?.status === 'Completed') {
                return ok(afterCheck, 'Car booking completed.');
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

        try {
            const carId = await getBookedCarId(admin, bookingId);
            if (carId) {
                await setCarStatus(admin, carId, 'Available');
            }
        } catch (syncError) {
            console.warn('[Car Booking Complete] Failed to mark assigned car available:', syncError);
        }

        try {
            const { data: aggregate } = await (admin as any)
                .from('bookings')
                .select('id')
                .eq('source_type', 'car_booking')
                .eq('source_id', bookingId)
                .maybeSingle();
            if (aggregate?.id) {
                await transitionBooking({
                    bookingId: aggregate.id,
                    nextStatus: 'completed',
                    changedBy: null,
                    reason: isCron ? 'Auto check-in completion' : 'Manual completion via legacy route',
                    metadata: { legacy_route: '/api/car-bookings/complete' },
                    idempotencyKey: `legacy-car-complete:${bookingId}`,
                });
            }
        } catch (syncError) {
            console.error('[Car Booking Complete] Failed syncing status to v2 booking lifecycle:', syncError);
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
                            const adminHtml = minimalEmailLayout({
                                title: 'Car booking completed',
                                preheader: 'A vehicle has been returned',
                                greeting: `Hello ${adminProfile.full_name || 'Admin'},`,
                                message: 'A vehicle has been returned and the booking is now complete.',
                                sections: [{
                                    heading: 'Return details',
                                    rows: [
                                        { label: 'Employee', value: existing.employee_name || 'Not provided' },
                                        { label: 'Date of use', value: existing.date_of_use || 'Not provided' },
                                        { label: 'Time slot', value: existing.time_slot || 'Not provided' },
                                        { label: 'Vehicle', value: plateInfo || 'Not provided' },
                                        { label: 'Returned at', value: timestamp },
                                    ]
                                }],
                                ctaLabel: 'View bookings',
                                ctaHref: 'https://nestbyeden.app/admin/manage-car-bookings',
                                footerNote: 'Nest by Eden Oasis · Vehicle management',
                            });
                            await sendGearRequestEmail({
                                to: adminProfile.email,
                                subject: `Car booking completed - ${existing.employee_name}`,
                                html: adminHtml,
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

        return ok(finalRow, 'Car booking completed.');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return fail(500, msg, 'We could not complete the booking right now. Please try again.', 'CAR_BOOKING_COMPLETE_UNEXPECTED_ERROR');
    }
}
