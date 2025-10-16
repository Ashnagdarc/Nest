import { Resend } from 'resend';



// Validate environment variable
if (!process.env.RESEND_API_KEY) {
  console.warn('[Email Service] RESEND_API_KEY environment variable is not set - email notifications will be skipped');
}

const resend = new Resend(process.env.RESEND_API_KEY);
// Configurable sender (set RESEND_FROM to a verified domain sender in your Email provider)
const RESEND_FROM = process.env.RESEND_FROM || 'Nest by Eden Oasis <onboarding@resend.dev>';

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
  const html = `
    ${EMAIL_STYLES}
    <div class="email-container">
      <div class="email-header">
        <h1>👋 Welcome to Nest!</h1>
      </div>
      <div class="email-body">
        <h2>Hello${userName ? ` ${userName}` : ''},</h2>
        <p>We're excited to have you on board. Start managing your assets and equipment with ease.</p>
        <p style="margin-top:24px; font-size:14px; color:#718096;">If you have any questions, just reply to this email or contact support.</p>
      </div>
      <div class="email-footer">
        <p>— The Nest by Eden Oasis Team</p>
      </div>
    </div>
  `;
  return sendGearRequestEmail({
    to,
    subject: '👋 Welcome to Nest by Eden Oasis',
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

  const html = `
    ${EMAIL_STYLES}
    <div class="email-container">
      <div class="email-header">
        <h1>📢 New Announcement</h1>
        <p class="subtitle">Important update from ${authorName}</p>
      </div>
      
      <div class="email-body">
        <h2>Hello ${userName},</h2>
        
        <p>A new announcement has been posted that requires your attention:</p>
        
        <div class="info-note">
          <h3 style="margin: 0 0 10px 0; color: #2d3748;">${announcementTitle}</h3>
          <div style="white-space: pre-wrap; line-height: 1.6;">${announcementContent}</div>
        </div>
        
        <p>Please review this announcement in your dashboard for complete details and any required actions.</p>
        
        <a href="${announcementUrl}" class="action-button">
          View Full Announcement
        </a>
        
        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          This announcement was sent to all users. If you have any questions, please contact your administrator.
        </p>
      </div>
      
      <div class="email-footer">
        <p>
          This email was sent from <a href="${siteUrl}">Nest by Eden Oasis</a><br>
          Asset Management System
        </p>
      </div>
    </div>
  `;

  return await sendGearRequestEmail({
    to,
    subject: `📢 New Announcement: ${announcementTitle}`,
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

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gear Request Approved</title>
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>🎉 Request Approved!</h1>
              <p class="subtitle">Your gear request has been approved and is ready for pickup</p>
            </div>
            
            <div class="email-body">
              <h2>Hi ${userName || 'there'},</h2>
              
              <div class="success-note">
                <strong>Great news!</strong> Your gear request has been approved and is ready for pickup.
              </div>
              
              <div class="gear-details">
                <h3 style="margin: 0 0 16px 0; color: #2d3748;">Approved Equipment:</h3>
                ${createGearListHTML(gears)}
              </div>
              
              <p><strong>Due Date:</strong> ${formattedDueDate}</p>
              
              <p><strong>Pickup Instructions:</strong></p>
              <ul>
                <li>Please collect your equipment from the designated pickup location</li>
                <li>Bring your ID for verification</li>
                <li>Inspect the equipment before leaving</li>
                <li>Return equipment on or before the due date</li>
              </ul>
              
              <a href="https://nestbyeden.app/user/my-requests" class="action-button">
                View Request Details
              </a>
              
              <div class="important-note">
                <strong>Important:</strong> Please ensure all equipment is returned in the same condition. 
                Any damage or missing items may result in charges.
              </div>
            </div>
            
            <div class="email-footer">
              <p>Thank you for using <strong>Nest by Eden Oasis</strong></p>
              <p>If you have any questions, please contact the admin team</p>
              <p><a href="https://nestbyeden.app">nestbyeden.app</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendGearRequestEmail({
    to,
    subject: '🎉 Your Gear Request Has Been Approved - Ready for Pickup!',
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

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gear Request Update</title>
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>📋 Request Update</h1>
              <p class="subtitle">Your gear request status has been updated</p>
            </div>
            
            <div class="email-body">
              <h2>Hi ${userName || 'there'},</h2>
              
              <div class="important-note">
                <strong>Request Status:</strong> Your gear request has been reviewed and cannot be approved at this time.
              </div>
              
              <div class="gear-details">
                <h3 style="margin: 0 0 16px 0; color: #2d3748;">Requested Equipment:</h3>
                ${createGearListHTML(gears)}
              </div>
              
              <p><strong>Reason for Rejection:</strong></p>
              <div style="background-color: #fed7d7; padding: 12px; border-radius: 4px; margin: 12px 0;">
                ${reason || 'No specific reason provided'}
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review the reason provided above</li>
                <li>If you believe this is an error, please contact the admin team</li>
                <li>You may submit a new request with corrected information</li>
              </ul>
              
              <a href="https://nestbyeden.app/user/my-requests" class="action-button">
                View Request Details
              </a>
              
              <div class="info-note">
                <strong>Need Help?</strong> If you have questions about this decision or need assistance 
                with your request, please don't hesitate to contact the admin team.
              </div>
            </div>
            
            <div class="email-footer">
              <p>Thank you for using <strong>Nest by Eden Oasis</strong></p>
              <p>We appreciate your understanding</p>
              <p><a href="https://nestbyeden.app">nestbyeden.app</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendGearRequestEmail({
    to,
    subject: '📋 Gear Request Update - Status Changed',
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

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Check-in Approved</title>
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>✅ Check-in Approved!</h1>
              <p class="subtitle">Your equipment has been successfully returned</p>
            </div>
            
            <div class="email-body">
              <h2>Hi ${userName || 'there'},</h2>
              
              <div class="success-note">
                <strong>Success!</strong> Your equipment check-in has been approved and processed.
              </div>
              
              <div class="gear-details">
                <h3 style="margin: 0 0 16px 0; color: #2d3748;">Returned Equipment:</h3>
                ${createGearListHTML(gearList)}
              </div>
              
              <p><strong>Check-in Date:</strong> ${formattedCheckinDate}</p>
              <p><strong>Overall Condition:</strong> <span class="gear-status status-${condition.toLowerCase()}">${condition}</span></p>
              
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
              
              <a href="https://nestbyeden.app/user/history" class="action-button">
                View Check-in History
              </a>
              
              <div class="info-note">
                <strong>Thank you!</strong> We appreciate you returning the equipment on time and in good condition.
              </div>
            </div>
            
            <div class="email-footer">
              <p>Thank you for using <strong>Nest by Eden Oasis</strong></p>
              <p>Your equipment has been successfully processed</p>
              <p><a href="https://nestbyeden.app">nestbyeden.app</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendGearRequestEmail({
    to,
    subject: '✅ Equipment Check-in Approved - Thank You!',
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

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Check-in Update</title>
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>⚠️ Check-in Update</h1>
              <p class="subtitle">Your equipment check-in requires attention</p>
            </div>
            
            <div class="email-body">
              <h2>Hi ${userName || 'there'},</h2>
              
              <div class="important-note">
                <strong>Check-in Status:</strong> Your equipment check-in has been reviewed and requires additional action.
              </div>
              
              <div class="gear-details">
                <h3 style="margin: 0 0 16px 0; color: #2d3748;">Equipment in Question:</h3>
                ${createGearListHTML(gearList)}
              </div>
              
              <p><strong>Check-in Date:</strong> ${formattedCheckinDate}</p>
              
              <p><strong>Reason for Rejection:</strong></p>
              <div style="background-color: #fed7d7; padding: 12px; border-radius: 4px; margin: 12px 0;">
                ${reason}
              </div>
              
              <p><strong>Required Actions:</strong></p>
              <ul>
                <li>Please review the reason provided above</li>
                <li>Address any issues mentioned</li>
                <li>Contact the admin team if you have questions</li>
                <li>You may need to resubmit the check-in with corrections</li>
              </ul>
              
              <a href="https://nestbyeden.app/user/history" class="action-button">
                View Check-in History
              </a>
              
              <div class="info-note">
                <strong>Need Assistance?</strong> If you need help resolving this issue or have questions, 
                please contact the admin team immediately.
              </div>
            </div>
            
            <div class="email-footer">
              <p>Thank you for using <strong>Nest by Eden Oasis</strong></p>
              <p>We're here to help resolve any issues</p>
              <p><a href="https://nestbyeden.app">nestbyeden.app</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendGearRequestEmail({
    to,
    subject: '⚠️ Equipment Check-in Update - Action Required',
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
  const gears = gearList.split(',').map(name => ({ name: name.trim() }));

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Request Received</title>
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>📝 Request Received</h1>
              <p class="subtitle">Your equipment request has been submitted</p>
            </div>
            
            <div class="email-body">
              <h2>Hi ${userName || 'there'},</h2>
              
              <div class="info-note">
                <strong>Confirmation:</strong> We've received your equipment request and it's now under review.
              </div>
              
              <div class="gear-details">
                <h3 style="margin: 0 0 16px 0; color: #2d3748;">Requested Equipment:</h3>
                ${createGearListHTML(gears)}
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Your request will be reviewed by the admin team</li>
                <li>You'll receive an email notification once a decision is made</li>
                <li>If approved, you'll get pickup instructions</li>
                <li>If rejected, you'll receive the reason and next steps</li>
              </ul>
              
              <a href="https://nestbyeden.app/user/my-requests" class="action-button">
                Track Your Request
              </a>
              
              <div class="info-note">
                <strong>Processing Time:</strong> Most requests are processed within 24 hours during business days.
              </div>
            </div>
            
            <div class="email-footer">
              <p>Thank you for using <strong>Nest by Eden Oasis</strong></p>
              <p>We'll notify you as soon as your request is reviewed</p>
              <p><a href="https://nestbyeden.app">nestbyeden.app</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendGearRequestEmail({
    to,
    subject: '📝 Equipment Request Received - Under Review',
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

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Overdue Equipment Reminder</title>
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>⏰ Equipment Overdue</h1>
              <p class="subtitle">Please return your equipment as soon as possible</p>
            </div>
            
            <div class="email-body">
              <h2>Hi ${userName || 'there'},</h2>
              
              <div class="important-note">
                <strong>Urgent:</strong> You have equipment that is ${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue.
              </div>
              
              <div class="gear-details">
                <h3 style="margin: 0 0 16px 0; color: #2d3748;">Overdue Equipment:</h3>
                ${gearList.map(gear => `
                  <div class="gear-item">
                    <span class="gear-name">${gear.name}</span>
                    <span style="color: #e53e3e; font-size: 12px;">Due: ${formatDate(gear.dueDate)}</span>
                  </div>
                `).join('')}
              </div>
              
              <p><strong>Original Due Date:</strong> ${formattedDueDate}</p>
              <p><strong>Days Overdue:</strong> ${overdueDays}</p>
              
              <p><strong>Immediate Action Required:</strong></p>
              <ul>
                <li>Please return the equipment immediately</li>
                <li>Contact the admin team if you need an extension</li>
                <li>Ensure equipment is in good condition</li>
                <li>Late returns may affect future requests</li>
              </ul>
              
              <a href="https://nestbyeden.app/user/check-in" class="action-button">
                Check-in Equipment Now
              </a>
              
              <div class="important-note">
                <strong>Important:</strong> Continued delays may result in account restrictions or charges.
              </div>
            </div>
            
            <div class="email-footer">
              <p>Thank you for using <strong>Nest by Eden Oasis</strong></p>
              <p>Please return equipment promptly to avoid any issues</p>
              <p><a href="https://nestbyeden.app">nestbyeden.app</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

  return sendGearRequestEmail({
    to,
    subject: `⏰ Equipment Overdue - ${overdueDays} Day${overdueDays > 1 ? 's' : ''} Late`,
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