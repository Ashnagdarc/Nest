import { Resend } from 'resend';
import { createHash } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';



// Validate environment variable
if (!process.env.RESEND_API_KEY) {
  console.warn('[Email Service] RESEND_API_KEY environment variable is not set - email notifications will be skipped');
}

const resend = new Resend(process.env.RESEND_API_KEY);
// Configurable sender (set RESEND_FROM to a verified domain sender in your Email provider)
const RESEND_FROM = process.env.RESEND_FROM || 'Nest by Eden Oasis <onboarding@resend.dev>';
const EMAIL_RETRY_DELAY_MINUTES = 5;

const resolveBaseUrl = (): string | null => {
  const explicitBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    null;

  if (explicitBase) return explicitBase.replace(/\/+$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
};

async function triggerEmailWorker() {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return;

  const headers: Record<string, string> = {};
  if (process.env.CRON_SECRET) {
    headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
  }

  try {
    await fetch(`${baseUrl}/api/email/worker`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
  } catch {
    // Non-blocking best effort
  }
}

// Email template base styles
const EMAIL_STYLES = `
  <style>
    .email-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 40px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-header .subtitle {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .email-body {
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    .email-body h2 {
      color: #2d3748;
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
    }
    .email-body p {
      margin: 0 0 16px 0;
    }
    .gear-details {
      background-color: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .gear-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .gear-item:last-child {
      border-bottom: none;
    }
    .gear-name {
      font-weight: 600;
      color: #2d3748;
    }
    .gear-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-approved {
      background-color: #c6f6d5;
      color: #22543d;
    }
    .status-rejected {
      background-color: #fed7d7;
      color: #742a2a;
    }
    .status-pending {
      background-color: #fef5e7;
      color: #744210;
    }
    .status-completed {
      background-color: #bee3f8;
      color: #2a4365;
    }
    .action-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .action-button:hover {
      opacity: 0.9;
    }
    .email-footer {
      background-color: #f7fafc;
      padding: 20px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .email-footer p {
      margin: 0;
      font-size: 14px;
      color: #718096;
    }
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
    .important-note {
      background-color: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 16px;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
    }
    .success-note {
      background-color: #f0fff4;
      border-left: 4px solid #48bb78;
      padding: 16px;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
    }
    .info-note {
      background-color: #ebf8ff;
      border-left: 4px solid #4299e1;
      padding: 16px;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
    }
  </style>
`;

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to create gear list HTML
function createGearListHTML(gears: Array<{ name: string; id?: string; condition?: string }>): string {
  if (!gears || gears.length === 0) return '<p><em>No gear specified</em></p>';

  return gears.map(gear => `
    <div class="gear-item">
      <span class="gear-name">${gear.name}</span>
      ${gear.condition ? `<span class="gear-status status-${gear.condition.toLowerCase()}">${gear.condition}</span>` : ''}
    </div>
  `).join('');
}

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
      from: RESEND_FROM,
      to,
      subject,
      html,
    });
    console.log('[Email Service] Email sent successfully:', { to, subject, result });
    return { success: true, result };
  } catch (error: unknown) {
    console.error('[Email Service Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to send email: ${errorMessage}` };
  }
}

// Minimal, short welcome email for new users
export async function sendWelcomeEmail({ to, userName }: { to: string; userName?: string }) {
  const html = minimalEmailLayout({
    title: 'Welcome to Nest by Eden',
    preheader: 'Your account is ready',
    greeting: `Hello${userName ? ` ${userName}` : ''},`,
    message: 'Welcome to Nest by Eden Oasis. Your account is ready and you can now request and manage equipment and car bookings.',
    ctaLabel: 'Open dashboard',
    ctaHref: 'https://nestbyeden.app/user',
  });
  return sendGearRequestEmail({
    to,
    subject: 'Welcome to Nest by Eden Oasis',
    html,
  });
}

// Announcement email template
export async function sendAnnouncementEmail({
  to,
  userName,
  announcementTitle,
  announcementContent,
  authorName,
  announcementId,
}: {
  to: string;
  userName: string;
  announcementTitle: string;
  announcementContent: string;
  authorName: string;
  announcementId: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nest-eden-oasis.vercel.app';
  const announcementUrl = `${siteUrl}/user/announcements?announcement=${announcementId}`;

  const html = minimalEmailLayout({
    title: 'New announcement',
    preheader: `Update from ${authorName}`,
    greeting: `Hello ${userName},`,
    message: 'A new announcement has been posted.',
    sections: [{
      heading: announcementTitle,
      rows: [
        { label: 'Posted by', value: authorName },
        { label: 'Message', value: announcementContent },
      ],
    }],
    ctaLabel: 'View announcement',
    ctaHref: announcementUrl,
    footerNote: `Sent from Nest by Eden Oasis · ${siteUrl}`,
  });

  return await sendGearRequestEmail({
    to,
    subject: `New announcement: ${announcementTitle}`,
    html,
  });
}

// Enhanced approval email template
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
  const gears = gearList.split(',').map(name => ({ name: name.trim() }));
  const formattedDueDate = formatDate(dueDate);

  const html = minimalEmailLayout({
    title: 'Gear request approved',
    preheader: 'Your request is approved',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your gear request has been approved.',
    sections: [
      {
        heading: 'Approved items',
        rows: gears.map(g => ({ label: g.name, value: 'Approved' })),
      },
      {
        heading: 'Request details',
        rows: [{ label: 'Return by', value: formattedDueDate }],
      },
    ],
    listItems: [
      'Bring an ID for pickup verification.',
      'Inspect items at pickup.',
      'Return items by the due date.',
    ],
    ctaLabel: 'View request',
    ctaHref: 'https://nestbyeden.app/user/my-requests',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Gear request approved',
    html,
  });
}

// Enhanced rejection email template
export async function sendRejectionEmail({
  to,
  userName,
  gearList,
  reason,
}: {
  to: string;
  userName: string;
  gearList: string;
  reason: string;
}) {
  const gears = gearList.split(',').map(name => ({ name: name.trim() }));

  const html = minimalEmailLayout({
    title: 'Gear request update',
    preheader: 'Your request was not approved',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your gear request was reviewed and could not be approved.',
    sections: [
      {
        heading: 'Requested items',
        rows: gears.map(g => ({ label: g.name, value: 'Requested' })),
      },
      {
        heading: 'Reason',
        rows: [{ label: 'Not approved', value: reason || 'No specific reason provided' }],
      },
    ],
    listItems: [
      'Review the reason above.',
      'You can submit a new request with updated details.',
    ],
    ctaLabel: 'View requests',
    ctaHref: 'https://nestbyeden.app/user/my-requests',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Gear request update',
    html,
  });
}

// New: Check-in approval email template
export async function sendCheckinApprovalEmail({
  to,
  userName,
  gearList,
  checkinDate,
  condition,
  notes,
}: {
  to: string;
  userName: string;
  gearList: Array<{ name: string; condition: string }>;
  checkinDate: string;
  condition: string;
  notes?: string;
}) {
  const formattedCheckinDate = formatDate(checkinDate);

  const html = minimalEmailLayout({
    title: 'Check-in approved',
    preheader: 'Your return has been accepted',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your equipment return has been approved.',
    sections: [
      {
        heading: 'Returned items',
        rows: gearList.map(item => ({
          label: item.name,
          value: item.condition || condition,
        })),
      },
      {
        heading: 'Return details',
        rows: [
          { label: 'Check-in time', value: formattedCheckinDate },
          { label: 'Condition', value: condition },
          { label: 'Notes', value: notes || 'None' },
        ],
      },
    ],
    ctaLabel: 'View history',
    ctaHref: 'https://nestbyeden.app/user/history',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Equipment check-in approved',
    html,
  });
}

// New: Check-in rejection email template
export async function sendCheckinRejectionEmail({
  to,
  userName,
  gearList,
  reason,
  checkinDate,
}: {
  to: string;
  userName: string;
  gearList: Array<{ name: string }>;
  reason: string;
  checkinDate: string;
}) {
  const formattedCheckinDate = formatDate(checkinDate);

  const html = minimalEmailLayout({
    title: 'Check-in requires action',
    preheader: 'Your return was not accepted',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your check-in was reviewed and needs correction.',
    sections: [
      {
        heading: 'Items',
        rows: gearList.map(item => ({ label: item.name, value: 'Review required' })),
      },
      {
        heading: 'Issue details',
        rows: [
          { label: 'Check-in time', value: formattedCheckinDate },
          { label: 'Reason', value: reason || 'No reason provided' },
        ],
      },
    ],
    listItems: [
      'Review the reason above.',
      'Correct the issue and resubmit check-in if required.',
      'Contact admin if you need help.',
    ],
    ctaLabel: 'View check-in history',
    ctaHref: 'https://nestbyeden.app/user/history',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Equipment check-in update',
    html,
  });
}

// New: Request received confirmation email
export async function sendRequestReceivedEmail({
  to,
  userName,
  gearList,
}: {
  to: string;
  userName: string;
  gearList: string;
}) {
  const gears = gearList.split(',').map(name => name.trim()).filter(Boolean);
  const html = minimalEmailLayout({
    title: 'Request received',
    preheader: 'Your equipment request is under review',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your equipment request has been submitted and is under review.',
    sections: [{
      heading: 'Requested items',
      rows: gears.map(name => ({ label: name, value: 'Pending review' })),
    }],
    listItems: [
      'An admin will review your request.',
      'You will receive an email update once a decision is made.',
    ],
    ctaLabel: 'Track request',
    ctaHref: 'https://nestbyeden.app/user/my-requests',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Equipment request received',
    html,
  });
}

// New: Overdue equipment reminder email
// REMOVED: Calendar reservation email templates

// REMOVED: Calendar booking functionality
export async function sendReservationApprovedEmail_DISABLED({
  to,
  userName,
  gearName,
  startDate,
  endDate,
  adminNotes,
}: {
  to: string;
  userName: string;
  gearName: string;
  startDate: string;
  endDate: string;
  adminNotes?: string;
}) {
  try {
    const html = `
      ${EMAIL_STYLES}
      <div class="email-container">
        <div class="email-header">
          <h1>✅ Reservation Approved!</h1>
          <p class="subtitle">Your equipment is ready for check-out</p>
        </div>
        <div class="email-body">
          <h2>Great news, ${userName}!</h2>
          <p>Your calendar reservation has been <strong>approved</strong> and is now available for check-out.</p>
          
          <div class="gear-details">
            <h3 style="margin-top: 0; color: #2d3748;">Approved Reservation</h3>
            <div class="gear-item">
              <span class="gear-name">Equipment:</span>
              <span>${gearName}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Start Date:</span>
              <span>${formatDate(startDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">End Date:</span>
              <span>${formatDate(endDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Status:</span>
              <span class="gear-status status-approved">Approved</span>
            </div>
          </div>

          ${adminNotes ? `
            <div class="info-note">
              <p><strong>Admin Notes:</strong></p>
              <p>${adminNotes}</p>
            </div>
          ` : ''}

          <div class="success-note">
            <p><strong>Next Steps:</strong></p>
            <p>Visit the check-in page to collect your approved equipment. Make sure to return it by the end date to avoid any late fees.</p>
          </div>
        </div>
        <div class="email-footer">
          <p>Nest by Eden Oasis Equipment Management</p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `✅ Reservation Approved: ${gearName}`,
      html,
    });

    if (error) {
      console.error('[Email Error] Reservation approved:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Email Error] Reservation approved:', error);
    return { success: false, error: error.message };
  }
}

// REMOVED: Calendar booking functionality
export async function sendReservationRejectedEmail_DISABLED({
  to,
  userName,
  gearName,
  startDate,
  endDate,
  reason,
}: {
  to: string;
  userName: string;
  gearName: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  try {
    const html = `
      ${EMAIL_STYLES}
      <div class="email-container">
        <div class="email-header">
          <h1>❌ Reservation Update</h1>
          <p class="subtitle">Your reservation request needs attention</p>
        </div>
        <div class="email-body">
          <h2>Hello ${userName},</h2>
          <p>Unfortunately, your calendar reservation request could not be approved at this time.</p>
          
          <div class="gear-details">
            <h3 style="margin-top: 0; color: #2d3748;">Reservation Details</h3>
            <div class="gear-item">
              <span class="gear-name">Equipment:</span>
              <span>${gearName}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Start Date:</span>
              <span>${formatDate(startDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">End Date:</span>
              <span>${formatDate(endDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Status:</span>
              <span class="gear-status status-rejected">Rejected</span>
            </div>
          </div>

          ${reason ? `
            <div class="important-note">
              <p><strong>Reason:</strong></p>
              <p>${reason}</p>
            </div>
          ` : ''}

          <div class="info-note">
            <p><strong>What you can do:</strong></p>
            <p>Please contact an administrator for more details, or try booking different dates when the equipment might be available.</p>
          </div>
        </div>
        <div class="email-footer">
          <p>Nest by Eden Oasis Equipment Management</p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `❌ Reservation Update: ${gearName}`,
      html,
    });

    if (error) {
      console.error('[Email Error] Reservation rejected:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Email Error] Reservation rejected:', error);
    return { success: false, error: error.message };
  }
}

// REMOVED: Calendar booking functionality
export async function sendReservationCancelledEmail_DISABLED({
  to,
  userName,
  gearName,
  startDate,
  endDate,
  cancelledBy,
}: {
  to: string;
  userName: string;
  gearName: string;
  startDate: string;
  endDate: string;
  cancelledBy: 'user' | 'admin';
}) {
  try {
    const isUserCancelled = cancelledBy === 'user';
    const title = isUserCancelled ? 'Reservation Cancelled' : 'Reservation Cancelled by Admin';
    const message = isUserCancelled
      ? 'Your reservation has been successfully cancelled.'
      : 'Your reservation has been cancelled by an administrator.';

    const html = `
      ${EMAIL_STYLES}
      <div class="email-container">
        <div class="email-header">
          <h1>🚫 ${title}</h1>
          <p class="subtitle">Reservation update notification</p>
        </div>
        <div class="email-body">
          <h2>Hello ${userName},</h2>
          <p>${message}</p>
          
          <div class="gear-details">
            <h3 style="margin-top: 0; color: #2d3748;">Cancelled Reservation</h3>
            <div class="gear-item">
              <span class="gear-name">Equipment:</span>
              <span>${gearName}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Start Date:</span>
              <span>${formatDate(startDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">End Date:</span>
              <span>${formatDate(endDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Status:</span>
              <span class="gear-status status-rejected">Cancelled</span>
            </div>
          </div>

          ${!isUserCancelled ? `
            <div class="important-note">
              <p><strong>Admin Cancellation:</strong></p>
              <p>This reservation was cancelled by an administrator. Please contact admin for more details if needed.</p>
            </div>
          ` : `
            <div class="info-note">
              <p><strong>Cancellation Confirmed:</strong></p>
              <p>Your reservation has been removed from the calendar. You can create a new reservation anytime.</p>
            </div>
          `}
        </div>
        <div class="email-footer">
          <p>Nest by Eden Oasis Equipment Management</p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `🚫 ${title}: ${gearName}`,
      html,
    });

    if (error) {
      console.error('[Email Error] Reservation cancelled:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Email Error] Reservation cancelled:', error);
    return { success: false, error: error.message };
  }
}

// REMOVED: Calendar booking functionality
export async function sendReservationReminderEmail_DISABLED({
  to,
  userName,
  gearName,
  startDate,
  endDate,
  daysUntilStart,
}: {
  to: string;
  userName: string;
  gearName: string;
  startDate: string;
  endDate: string;
  daysUntilStart: number;
}) {
  try {
    const isToday = daysUntilStart === 0;
    const isTomorrow = daysUntilStart === 1;

    let reminderText = '';
    if (isToday) {
      reminderText = 'Your reservation starts today!';
    } else if (isTomorrow) {
      reminderText = 'Your reservation starts tomorrow!';
    } else {
      reminderText = `Your reservation starts in ${daysUntilStart} days.`;
    }

    const html = `
      ${EMAIL_STYLES}
      <div class="email-container">
        <div class="email-header">
          <h1>⏰ Reservation Reminder</h1>
          <p class="subtitle">${reminderText}</p>
        </div>
        <div class="email-body">
          <h2>Hello ${userName}!</h2>
          <p>This is a friendly reminder about your upcoming equipment reservation.</p>
          
          <div class="gear-details">
            <h3 style="margin-top: 0; color: #2d3748;">Upcoming Reservation</h3>
            <div class="gear-item">
              <span class="gear-name">Equipment:</span>
              <span>${gearName}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Start Date:</span>
              <span>${formatDate(startDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">End Date:</span>
              <span>${formatDate(endDate)}</span>
            </div>
            <div class="gear-item">
              <span class="gear-name">Status:</span>
              <span class="gear-status status-approved">Approved</span>
            </div>
          </div>

          <div class="success-note">
            <p><strong>Ready to collect?</strong></p>
            <p>${isToday ? 'You can collect your equipment today!' : 'Make sure you\'re ready to collect your equipment on the start date.'} Visit the check-in page or contact an administrator.</p>
          </div>
        </div>
        <div class="email-footer">
          <p>Nest by Eden Oasis Equipment Management</p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `⏰ Reservation Reminder: ${gearName} ${isToday ? '(Today!)' : isTomorrow ? '(Tomorrow)' : `(${daysUntilStart} days)`}`,
      html,
    });

    if (error) {
      console.error('[Email Error] Reservation reminder:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Email Error] Reservation reminder:', error);
    return { success: false, error: error.message };
  }
}

export async function sendOverdueReminderEmail({
  to,
  userName,
  gearList,
  dueDate,
  overdueDays,
}: {
  to: string;
  userName: string;
  gearList: Array<{ name: string; dueDate: string }>;
  dueDate: string;
  overdueDays: number;
}) {
  const formattedDueDate = formatDate(dueDate);

  const html = minimalEmailLayout({
    title: 'Equipment overdue reminder',
    preheader: `You have equipment overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
    greeting: `Hello ${userName || 'there'},`,
    message: `You have equipment that is ${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue.`,
    sections: [
      {
        heading: 'Overdue items',
        rows: gearList.map(gear => ({
          label: gear.name,
          value: `Due ${formatDate(gear.dueDate)}`,
        })),
      },
      {
        heading: 'Reminder',
        rows: [
          { label: 'Original due date', value: formattedDueDate },
          { label: 'Days overdue', value: String(overdueDays) },
        ],
      },
    ],
    listItems: [
      'Please return the equipment as soon as possible.',
      'Contact admin if you need support.',
    ],
    ctaLabel: 'Check in equipment',
    ctaHref: 'https://nestbyeden.app/user/check-in',
  });

  return sendGearRequestEmail({
    to,
    subject: `Equipment overdue (${overdueDays} day${overdueDays > 1 ? 's' : ''})`,
    html,
  });
}

// Car booking email templates
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function minimalEmailLayout({
  title,
  preheader,
  greeting,
  message,
  sections,
  listItems,
  ctaLabel,
  ctaHref,
  footerNote,
}: {
  title: string;
  preheader?: string;
  greeting: string;
  message: string;
  sections?: Array<{ heading: string; rows: Array<{ label: string; value: string }> }>;
  listItems?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
}) {
  const sectionHtml = (sections || []).map(section => `
    <div style="margin:24px 0;">
      <div style="font-size:14px;font-weight:700;margin:0 0 12px 0;">${escapeHtml(section.heading)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${section.rows.map(row => `
          <tr>
            <td style="padding:10px 16px 10px 0;border-top:1px solid #d4d4d4;font-size:14px;font-weight:600;vertical-align:top;width:30%;">${escapeHtml(row.label)}</td>
            <td style="padding:10px 0;border-top:1px solid #d4d4d4;font-size:14px;vertical-align:top;">${escapeHtml(row.value)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('');

  const listHtml = (listItems && listItems.length > 0)
    ? `<ul style="margin:10px 0 0 20px;padding:0;">${listItems.map(item => `<li style="margin:8px 0;font-size:14px;">${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';

  const ctaHtml = ctaLabel && ctaHref
    ? `<div style="margin:28px 0 8px 0;"><a href="${ctaHref}" style="display:inline-block;border:1px solid #111;color:#111;text-decoration:none;padding:10px 16px;font-size:14px;font-weight:600;">${escapeHtml(ctaLabel)}</a></div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;padding:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || title)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr>
            <td align="left" style="padding:24px;">
              <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;">
                <tr>
                  <td style="border-bottom:1px solid #111;padding-bottom:14px;">
                    <div style="font-size:28px;font-weight:700;line-height:1.2;">Nest by Eden</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <div style="font-size:30px;font-weight:700;line-height:1.2;margin:0 0 10px 0;">${escapeHtml(greeting)}</div>
                    <div style="font-size:15px;line-height:1.7;margin:0 0 10px 0;">${escapeHtml(message)}</div>
                    ${sectionHtml}
                    ${listHtml}
                    ${ctaHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:28px;border-top:1px solid #d4d4d4;font-size:12px;line-height:1.6;color:#111;">
                    ${escapeHtml(footerNote || 'Nest by Eden Oasis · Equipment and vehicle operations')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function normalizeCarLabel(carDetails?: string) {
  if (!carDetails) return 'Not assigned yet';
  return carDetails.replace(/\s+/g, ' ').trim();
}

export async function sendCarBookingRequestEmail({
  to,
  userName,
  dateOfUse,
  timeSlot,
  destination,
  purpose,
}: {
  to: string;
  userName: string;
  dateOfUse: string;
  timeSlot: string;
  destination?: string;
  purpose?: string;
}) {
  const formattedDate = formatDate(dateOfUse);
  const html = minimalEmailLayout({
    title: 'Car booking received',
    preheader: 'Your car booking request is under review',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your car booking request has been received and is now under review.',
    sections: [{
      heading: 'Booking details',
      rows: [
        { label: 'Date of use', value: formattedDate },
        { label: 'Time slot', value: timeSlot },
        { label: 'Destination', value: destination || 'Not provided' },
        { label: 'Purpose', value: purpose || 'Not provided' },
      ]
    }],
    listItems: [
      'An admin will review your request.',
      'You will receive an update by email once a decision is made.',
    ],
    ctaLabel: 'View booking',
    ctaHref: 'https://nestbyeden.app/user/car-booking',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Car booking request received',
    html,
  });
}

export async function sendCarBookingApprovalEmail({
  to,
  userName,
  dateOfUse,
  timeSlot,
  destination,
  carDetails,
}: {
  to: string;
  userName: string;
  dateOfUse: string;
  timeSlot: string;
  destination?: string;
  carDetails?: string;
}) {
  const formattedDate = formatDate(dateOfUse);
  const html = minimalEmailLayout({
    title: 'Car booking approved',
    preheader: 'Your booking has been approved',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your car booking has been approved.',
    sections: [{
      heading: 'Approved booking',
      rows: [
        { label: 'Date of use', value: formattedDate },
        { label: 'Time slot', value: timeSlot },
        { label: 'Destination', value: destination || 'Not provided' },
        { label: 'Vehicle', value: normalizeCarLabel(carDetails) },
      ]
    }],
    listItems: [
      'Bring your ID for pickup verification.',
      'Inspect the vehicle before departure.',
      'Return the vehicle at the scheduled end time.',
    ],
    ctaLabel: 'View booking',
    ctaHref: 'https://nestbyeden.app/user/car-booking',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Car booking approved',
    html,
  });
}

export async function sendCarBookingRejectionEmail({
  to,
  userName,
  dateOfUse,
  timeSlot,
  reason,
}: {
  to: string;
  userName: string;
  dateOfUse: string;
  timeSlot: string;
  reason?: string;
}) {
  const formattedDate = formatDate(dateOfUse);
  const html = minimalEmailLayout({
    title: 'Car booking update',
    preheader: 'Your booking request was not approved',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your car booking request was reviewed and could not be approved.',
    sections: [{
      heading: 'Booking details',
      rows: [
        { label: 'Date of use', value: formattedDate },
        { label: 'Time slot', value: timeSlot },
        { label: 'Reason', value: reason || 'No reason provided' },
      ]
    }],
    listItems: [
      'Review the reason above.',
      'You may submit a new request with updated details.',
    ],
    ctaLabel: 'View booking page',
    ctaHref: 'https://nestbyeden.app/user/car-booking',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Car booking request update',
    html,
  });
}

export async function sendCarReturnConfirmationEmail({
  to,
  userName,
  dateOfUse,
  timeSlot,
  carDetails,
  returnedAt,
}: {
  to: string;
  userName: string;
  dateOfUse: string;
  timeSlot: string;
  carDetails?: string;
  returnedAt: string;
}) {
  const formattedDate = formatDate(dateOfUse);
  const formattedReturnDate = formatDate(returnedAt);
  const html = minimalEmailLayout({
    title: 'Car return confirmed',
    preheader: 'Your vehicle return has been recorded',
    greeting: `Hello ${userName || 'there'},`,
    message: 'Your vehicle return has been recorded successfully.',
    sections: [{
      heading: 'Return details',
      rows: [
        { label: 'Booking date', value: formattedDate },
        { label: 'Time slot', value: timeSlot },
        { label: 'Vehicle', value: normalizeCarLabel(carDetails) },
        { label: 'Return time', value: formattedReturnDate },
      ]
    }],
    ctaLabel: 'View booking history',
    ctaHref: 'https://nestbyeden.app/user/car-booking',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Car return confirmed',
    html,
  });
}

export async function sendCarBookingCancellationEmail({
  to,
  userName,
  dateOfUse,
  timeSlot,
  destination,
  cancelledBy,
  reason,
}: {
  to: string;
  userName: string;
  dateOfUse: string;
  timeSlot: string;
  destination?: string;
  cancelledBy: 'user' | 'admin';
  reason?: string;
}) {
  const formattedDate = formatDate(dateOfUse);
  const isUserCancelled = cancelledBy === 'user';
  const title = isUserCancelled ? 'Car booking cancelled' : 'Car booking cancelled by admin';
  const html = minimalEmailLayout({
    title,
    preheader: title,
    greeting: `Hello ${userName || 'there'},`,
    message: `Your car booking has been cancelled ${isUserCancelled ? 'as requested.' : 'by an administrator.'}`,
    sections: [{
      heading: 'Cancelled booking details',
      rows: [
        { label: 'Date of use', value: formattedDate },
        { label: 'Time slot', value: timeSlot },
        { label: 'Destination', value: destination || 'Not provided' },
        { label: 'Reason', value: reason || 'Not provided' },
      ]
    }],
    ctaLabel: 'View bookings',
    ctaHref: 'https://nestbyeden.app/user/car-booking',
  });

  return sendGearRequestEmail({
    to,
    subject: title,
    html,
  });
}

// Gear Request Approval Email
export async function sendGearRequestApprovalEmail({
  to,
  userName,
  gearList,
  dueDate,
  requestId,
  reason,
  destination,
}: {
  to: string;
  userName: string;
  gearList: Array<{ name: string; quantity: number }>;
  dueDate: string;
  requestId?: string;
  reason?: string;
  destination?: string;
}) {
  const formattedDueDate = formatDate(dueDate);
  const html = minimalEmailLayout({
    title: 'Gear request approved',
    preheader: 'Your request has been approved',
    greeting: `Hello ${userName},`,
    message: 'Your gear request has been approved and is ready for pickup.',
    sections: [
      {
        heading: 'Approved items',
        rows: gearList.map(item => ({
          label: item.name,
          value: `Qty ${item.quantity}`,
        })),
      },
      {
        heading: 'Request details',
        rows: [
          { label: 'Return by', value: formattedDueDate },
          { label: 'Purpose', value: reason || 'Not provided' },
          { label: 'Destination', value: destination || 'Not provided' },
        ],
      },
    ],
    ctaLabel: 'View request details',
    ctaHref: `https://nestbyeden.app/user/gear-requests${requestId ? '?request=' + requestId : ''}`,
  });

  return sendGearRequestEmail({
    to,
    subject: 'Gear request approved',
    html,
  });
}

// Gear Request Rejection Email
export async function sendGearRequestRejectionEmail({
  to,
  userName,
  gearList,
  reason,
  requestReason,
  destination,
}: {
  to: string;
  userName: string;
  gearList: Array<{ name: string; quantity: number }>;
  reason?: string;
  requestReason?: string;
  destination?: string;
}) {
  const html = minimalEmailLayout({
    title: 'Gear request update',
    preheader: 'Your request was not approved',
    greeting: `Hello ${userName},`,
    message: 'Your gear request was reviewed and could not be approved at this time.',
    sections: [
      {
        heading: 'Requested items',
        rows: gearList.map(item => ({
          label: item.name,
          value: `Qty ${item.quantity}`,
        })),
      },
      {
        heading: 'Review details',
        rows: [
          { label: 'Reason', value: reason || 'No reason provided' },
          { label: 'Purpose', value: requestReason || 'Not provided' },
          { label: 'Destination', value: destination || 'Not provided' },
        ],
      },
    ],
    listItems: [
      'Review the details above.',
      'Submit a new request if needed.',
    ],
    ctaLabel: 'Submit new request',
    ctaHref: 'https://nestbyeden.app/user/gear-requests',
  });

  return sendGearRequestEmail({
    to,
    subject: 'Gear request update',
    html,
  });
}

// Backward compatible approval email (keeping for existing integrations)
export async function sendApprovalEmailLegacy({
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

export async function sendBookingLifecycleEmail({
  booking,
  items,
  to,
  userName,
  transition,
}: {
  booking: {
    id: string;
    reference: string;
    status: string;
    source_type?: string | null;
    source_id?: string | null;
    start_at?: string | null;
    end_at?: string | null;
  };
  items: Array<{ item_type: 'gear' | 'car'; quantity: number; status: string; metadata?: Record<string, unknown> }>;
  to: string;
  userName: string;
  transition: string;
}) {
  const normalizedTransition = transition.replace('_', ' ');
  const subject = `Booking ${booking.reference} is now ${normalizedTransition}`;
  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ bookingId: booking.id, to, subject, transition, items }))
    .digest('hex');

  let normalizedItems = items;
  if (normalizedItems.length === 0 && booking.source_type === 'car_booking' && booking.source_id) {
    try {
      const supabase = await createSupabaseServerClient(true);

      const { data: assignment } = await (supabase as any)
        .from('car_assignment')
        .select('car_id')
        .eq('booking_id', booking.source_id)
        .maybeSingle();

      let carLabel = 'Assigned car';
      if (assignment?.car_id) {
        const { data: car } = await (supabase as any)
          .from('cars')
          .select('label,plate')
          .eq('id', assignment.car_id)
          .maybeSingle();
        if (car?.label && car?.plate) carLabel = `${car.label} (${car.plate})`;
        else if (car?.label) carLabel = car.label;
        else if (car?.plate) carLabel = `Car (${car.plate})`;
      } else {
        carLabel = 'Car not assigned yet';
      }

      normalizedItems = [{
        item_type: 'car',
        quantity: 1,
        status: booking.status,
        metadata: {
          display_name: carLabel,
        },
      }];
    } catch (fallbackError) {
      console.warn('[Email Service] Failed to build car fallback items for lifecycle email:', fallbackError);
    }
  }

  const itemRows = normalizedItems.map((item, index) => {
    const md = item.metadata || {};
    const rawName =
      (md.display_name as string | undefined) ||
      (md.gear_name as string | undefined) ||
      (md.car_name as string | undefined) ||
      (item.item_type === 'car' ? `Car ${index + 1}` : `Gear ${index + 1}`);
    const plate = (md.plate as string | undefined) || (md.car_plate as string | undefined);
    const label = item.item_type === 'car' && plate ? `${rawName} (${plate})` : rawName;
    return {
      label,
      qty: String(item.quantity),
      status: item.status.replace('_', ' '),
    };
  });

  const html = minimalEmailLayout({
    title: `Booking ${booking.reference} update`,
    preheader: `Booking status changed to ${normalizedTransition}`,
    greeting: `Hello ${userName},`,
    message: `Your booking ${booking.reference} is now ${normalizedTransition}.`,
    sections: [
      {
        heading: 'Booking summary',
        rows: [
          { label: 'Booking reference', value: booking.reference },
          { label: 'Start', value: booking.start_at ? formatDate(booking.start_at) : 'Not set' },
          { label: 'Expected return', value: booking.end_at ? formatDate(booking.end_at) : 'Not set' },
          { label: 'Current status', value: booking.status.replace('_', ' ') },
        ],
      },
      ...(itemRows.length > 0 ? [{
        heading: 'Items',
        rows: itemRows.map(row => ({
          label: `${row.label} · Qty ${row.qty}`,
          value: row.status,
        })),
      }] : []),
    ],
    ctaLabel: 'View bookings',
    ctaHref: 'https://nestbyeden.app/user/my-requests',
  });

  const supabase = await createSupabaseServerClient(true);
  const nowIso = new Date().toISOString();
  const { data: existingLog } = await (supabase as any)
    .from('email_logs')
    .select('id,status')
    .eq('recipient', to)
    .eq('template_name', 'booking_lifecycle_update')
    .eq('payload_hash', payloadHash)
    .maybeSingle();

  if (existingLog?.status === 'sent') {
    return { success: true, deduped: true };
  }

  await (supabase as any).from('email_logs').upsert({
    booking_id: booking.id,
    provider: 'resend',
    template_name: 'booking_lifecycle_update',
    recipient: to,
    payload_hash: payloadHash,
    status: 'queued',
    attempt_count: 0,
    subject,
    html_body: html,
    next_attempt_at: nowIso,
    updated_at: nowIso,
  }, { onConflict: 'recipient,template_name,payload_hash' });

  const result = await sendGearRequestEmail({ to, subject, html });
  const wasSent = !!result.success;
  const failedNextAttemptAt = new Date(Date.now() + EMAIL_RETRY_DELAY_MINUTES * 60 * 1000).toISOString();

  await (supabase as any).from('email_logs').upsert({
    booking_id: booking.id,
    provider: 'resend',
    template_name: 'booking_lifecycle_update',
    recipient: to,
    payload_hash: payloadHash,
    status: wasSent ? 'sent' : 'failed',
    error_message: wasSent ? null : result.error || 'Unknown email error',
    provider_message_id: wasSent ? String((result as any).result?.data?.id || '') : null,
    attempt_count: 1,
    last_attempt_at: nowIso,
    processed_at: wasSent ? nowIso : null,
    subject,
    html_body: html,
    next_attempt_at: wasSent ? nowIso : failedNextAttemptAt,
    updated_at: nowIso,
  }, { onConflict: 'recipient,template_name,payload_hash' });

  if (!wasSent) {
    void triggerEmailWorker();
  }

  return result;
}
