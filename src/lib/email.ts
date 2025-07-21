import { Resend } from 'resend';

// Debug logging for environment variable
console.log('[Email Service Debug] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('[Email Service Debug] RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0);
console.log('[Email Service Debug] RESEND_API_KEY starts with:', process.env.RESEND_API_KEY?.substring(0, 3) || 'undefined');
console.log('[Email Service Debug] RESEND_API_KEY ends with:', process.env.RESEND_API_KEY?.substring(-3) || 'undefined');

// Validate environment variable
if (!process.env.RESEND_API_KEY) {
    console.warn('[Email Service] RESEND_API_KEY environment variable is not set - email notifications will be skipped');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendGearRequestEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    // Check if Resend is properly configured
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Email Service] RESEND_API_KEY not configured - skipping email');
        // Don't throw error, just log and continue
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const result = await resend.emails.send({
            from: 'Nest by Eden Oasis <onboarding@resend.dev>',
            to,
            subject,
            html,
        });
        console.log('[Email Service] Email sent successfully:', { to, subject });
        return { success: true, result };
    } catch (error: unknown) {
        console.error('[Email Service Error]:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to send email: ${errorMessage}` };
    }
}

// Backward compatible approval email
export async function sendApprovalEmail({
    to,
    userName,
    gearList,
    dueDate,
}: {
    to: string;
    userName: string;
    gearList: string;
    dueDate: string;
}) {
    return sendGearRequestEmail({
        to,
        subject: 'Your Gear Request Has Been Approved',
        html: `
      <h2>Hi ${userName || 'there'},</h2>
      <p>Your gear request has been <b>approved</b> and is ready for pickup.</p>
      <p><b>Gear:</b> ${gearList}</p>
      <p><b>Due Date:</b> ${dueDate}</p>
      <p>If you have any questions, please contact the admin team.</p>
      <br/>
      <p>Thank you,<br/>Nest by Eden Oasis Team</p>
    `,
    });
} 