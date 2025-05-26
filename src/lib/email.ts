import { Resend } from 'resend';

console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY); // DEBUG: Remove after testing
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
    return resend.emails.send({
        from: 'noreply@edenoasisrealty.com',
        to,
        subject,
        html,
    });
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
      <p>Thank you,<br/>Eden Oasis Realty Team</p>
    `,
    });
} 