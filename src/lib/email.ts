import { Resend } from 'resend';

// Validate environment variable
if (!process.env.RESEND_API_KEY) {
    console.error('[Email Service] RESEND_API_KEY environment variable is not set');
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
        throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    try {
        return await resend.emails.send({
            from: 'Nest by Eden Oasis <onboarding@resend.dev>',
            to,
            subject,
            html,
        });
    } catch (error: unknown) {
        console.error('[Email Service Error]:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to send email: ${errorMessage}`);
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