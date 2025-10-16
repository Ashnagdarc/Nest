# User Manual
## Nest - Asset & Equipment Management System

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**For:** End Users & Administrators  
**System Version:** 1.0.0

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Guide](#user-guide)
3. [Admin Guide](#admin-guide)
4. [Features & Workflows](#features--workflows)
5. [Mobile Usage](#mobile-usage)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Getting Started

### System Requirements

**Supported Browsers:**
- Google Chrome 90+
- Mozilla Firefox 88+
- Safari 14+
- Microsoft Edge 90+

**Supported Devices:**
- Desktop computers (Windows, macOS, Linux)
- Tablets (iPad, Android tablets)
- Mobile phones (iOS 14+, Android 10+)

**Internet Connection:**
- Minimum: 3G connection
- Recommended: 4G or WiFi for optimal performance

---

### Account Registration

**Step 1: Navigate to Signup Page**

1. Open your web browser
2. Go to: `https://nest-eden-oasis.vercel.app`
3. Click **"Sign Up"** button on the home page

**Step 2: Fill Registration Form**

Enter the following information:
- **Full Name:** Your complete name
- **Email Address:** Your work email (must be unique)
- **Password:** Minimum 8 characters, include uppercase, lowercase, number, and special character
- **Confirm Password:** Re-enter your password
- **Department:** Select your department (optional)
- **Phone Number:** Your contact number (optional)

**Step 3: Submit & Verify**

1. Click **"Create Account"** button
2. Check your email inbox for verification link
3. Click the verification link in the email
4. You'll be redirected to the login page

**Step 4: Complete Profile** (Optional)

1. Log in with your credentials
2. Navigate to **Settings** → **Profile**
3. Upload profile photo
4. Add bio and additional information
5. Click **"Save Changes"**

---

### First Login

1. Go to `https://nest-eden-oasis.vercel.app/login`
2. Enter your email and password
3. Click **"Log In"**
4. You'll be redirected to your dashboard

**Two User Roles:**
- **User:** Regular equipment user (browse, request, check-in/out)
- **Admin:** Full system access (all user features + management capabilities)

---

## User Guide

### Dashboard Overview

The user dashboard provides a quick overview of your equipment activities and system status.

**Dashboard Sections:**

1. **Quick Stats Cards**
   - Total Equipment: All available equipment in the system
   - Your Requests: Number of your active requests
   - Checked Out: Equipment currently checked out to you

2. **Quick Actions**
   - Browse Gears
   - Request Equipment
   - Check-In Equipment
   - View Notifications

3. **Recent Activity**
   - Your recent check-ins/outs
   - Request status changes
   - System notifications

4. **Popular Equipment**
   - Most requested items
   - Helps discover commonly used equipment

---

### Browsing Equipment

**Accessing the Equipment Catalog:**

1. Click **"Browse Gears"** from dashboard
2. Or navigate to: **Menu → Browse Gears**

**Viewing Equipment:**

The equipment catalog displays all available items with:
- Equipment photo
- Name and category
- Availability status
- Available quantity
- Category badge (color-coded)

**Filtering Equipment:**

Use the search and filter tools at the top:

1. **Search Bar:** Type equipment name or description
2. **Category Filter:** 
   - All Categories
   - Camera
   - Lighting
   - Audio
   - Accessories
   - Computers
   - Other

3. **Status Filter:**
   - Available
   - Checked Out
   - Partially Available
   - Under Repair

**Viewing Equipment Details:**

1. Click on any equipment card
2. View detailed information:
   - Full description
   - Serial number
   - Purchase date
   - Total quantity
   - Available quantity
   - Current status
3. Click **"Request This Item"** to start a request

---

### Requesting Equipment

**Starting a New Request:**

1. Navigate to **Menu → Request Gear**
2. Or click **"Request"** button on equipment details page

**Filling the Request Form:**

**Step 1: Select Equipment**
- Click **"+ Add Equipment"** button
- Search for equipment by name
- Select equipment from dropdown
- Set quantity needed (max: available quantity)
- Add multiple items if needed

**Step 2: Provide Request Details**
- **Reason:** Explain why you need the equipment (required, 10-500 characters)
- **Destination:** Where you'll use it (e.g., "Studio A", "Remote shoot")
- **Expected Duration:** How long you need it (e.g., "3 days", "1 week")
- **Team Members:** List any colleagues using the equipment (optional)

**Step 3: Review and Submit**
1. Review all selected items and details
2. Click **"Submit Request"** button
3. Request is sent to admin for approval
4. You'll receive a confirmation message

**Request Status Tracking:**

Navigate to **Menu → My Requests** to see:
- **Pending:** Awaiting admin approval
- **Approved:** Ready for checkout
- **Rejected:** Not approved (see admin notes)
- **Cancelled:** You cancelled the request
- **Completed:** Equipment returned

---

### Managing Your Requests

**Viewing Request History:**

1. Go to **Menu → My Requests**
2. See all your requests with status badges
3. Filter by status using tabs

**Request Actions:**

**For Pending Requests:**
- **Edit:** Modify reason, duration, or items (before approval)
- **Cancel:** Withdraw your request

**For Approved Requests:**
- **View Details:** See approval notes and due date
- **Check Out:** Begin using the equipment

**For Completed Requests:**
- **View:** See check-in history and condition reports

**Request Details View:**

Click any request to see:
- Request ID and creation date
- Status and approval/rejection date
- All requested items with quantities
- Reason and destination
- Admin notes (if any)
- Due date (for approved requests)
- Activity timeline

---

### Check-Out Process

**When to Check Out:**

After your request is approved, follow these steps to check out equipment:

**Method 1: Manual Check-Out**

1. Go to **Menu → My Requests**
2. Find your approved request
3. Click **"Check Out"** button
4. Confirm the items you're taking
5. Verify quantities
6. Click **"Confirm Check-Out"**

**Method 2: QR Code Scan**

1. Go to **Menu → Check-In Gear**
2. Click **"Scan QR Code"** button
3. Allow camera access
4. Point camera at equipment QR code
5. System automatically identifies equipment
6. Confirm check-out

---

### Check-In Process

**When to Check In:**

Return equipment before or on the due date to avoid overdue status.

**Check-In Steps:**

**Method 1: Manual Check-In**

1. Navigate to **Menu → Check-In Gear**
2. View list of equipment checked out to you
3. Select item(s) to return
4. Fill check-in form:
   - **Condition:** Excellent, Good, Fair, Poor, Damaged
   - **Notes:** Any observations about the equipment
   - **Damage Photo:** Upload photo if equipment is damaged
   - **Location:** Where you're returning it
5. Click **"Check In"** button
6. Confirm check-in

**Method 2: QR Code Scan**

1. Go to **Menu → Check-In Gear**
2. Click **"Scan QR Code"**
3. Scan equipment QR code
4. Fill condition form
5. Submit check-in

**After Check-In:**

- Equipment becomes available for others
- Admin receives check-in notification
- Your request status updates to "Completed"
- Success animation displays

---

### Notifications

**Accessing Notifications:**

1. Click the **Bell icon** (🔔) in top navigation
2. Notification badge shows unread count
3. View all notifications in notification center

**Notification Types:**

| Type | Icon | Description |
|------|------|-------------|
| Success | ✅ | Request approved, check-in confirmed |
| Info | ℹ️ | General information, updates |
| Warning | ⚠️ | Equipment due soon, action needed |
| Error | ❌ | Request rejected, issue detected |

**Managing Notifications:**

- **Mark as Read:** Click notification to mark as read
- **Take Action:** Click notification link to go to related page
- **Delete:** Swipe left (mobile) or click delete icon
- **Clear All:** Click "Mark All as Read" button

---

### Car Booking (If Enabled)

**Booking a Car:**

1. Navigate to **Menu → Book a Car**
2. View available vehicles
3. Click **"Book"** on desired car
4. Fill booking form:
   - Start date and time
   - End date and time
   - Purpose of trip
   - Destination
5. Submit booking request
6. Wait for admin approval

**Viewing Bookings:**

- Go to **Menu → My Bookings**
- See all car bookings with status
- View calendar of your bookings

---

### Profile Settings

**Accessing Settings:**

1. Click your avatar in top-right corner
2. Select **"Settings"** from dropdown

**Editable Profile Fields:**

- Full Name
- Department
- Phone Number
- Bio/Description
- Profile Photo

**Updating Profile:**

1. Edit desired fields
2. Click **"Save Changes"**
3. Changes apply immediately

**Changing Password:**

1. Go to **Settings → Security**
2. Click **"Change Password"**
3. Enter current password
4. Enter new password (twice)
5. Click **"Update Password"**

---

### Activity History

**Viewing Your History:**

1. Navigate to **Menu → History**
2. See chronological list of all activities:
   - Equipment requests
   - Check-outs
   - Check-ins
   - Status changes

**Filtering History:**

- By date range
- By equipment
- By action type

**Exporting History:**

1. Click **"Export"** button
2. Choose format: CSV or PDF
3. Download report

---

## Admin Guide

### Admin Dashboard

The admin dashboard provides comprehensive system oversight and management tools.

**Dashboard Sections:**

1. **System Statistics**
   - Total Equipment: All items in inventory
   - Available Equipment: Currently available
   - Checked Out: In use
   - Total Users: Registered users
   - Pending Requests: Awaiting approval
   - Pending Check-Ins: Awaiting admin verification

2. **Quick Actions**
   - Add New Equipment
   - Approve Requests
   - Manage Users
   - Generate Reports

3. **Pending Items**
   - High-priority items needing attention
   - Color-coded by urgency
   - Direct action buttons

4. **Recent Activity**
   - System-wide activity feed
   - User actions
   - Equipment status changes

---

### Equipment Management

**Accessing Equipment Management:**

1. Navigate to **Menu → Manage Gears**
2. View complete equipment inventory

**Adding New Equipment:**

1. Click **"+ Add Equipment"** button
2. Fill equipment form:
   - **Name:** Equipment name (required)
   - **Category:** Select from dropdown (required)
   - **Description:** Detailed description
   - **Serial Number:** Unique identifier (optional)
   - **Purchase Date:** When acquired
   - **Quantity:** Number of units (required)
   - **Image:** Upload equipment photo
3. Click **"Add Equipment"**
4. Equipment is immediately available

**Editing Equipment:**

1. Find equipment in list
2. Click **"Edit"** button (pencil icon)
3. Modify fields
4. Click **"Save Changes"**

**Deleting Equipment:**

1. Find equipment in list
2. Click **"Delete"** button (trash icon)
3. Confirm deletion
4. **Warning:** Only delete equipment with no active requests or check-outs

**Bulk Operations:**

**Import from CSV:**
1. Click **"Import CSV"** button
2. Download sample CSV template
3. Fill template with equipment data
4. Upload filled CSV file
5. Review import preview
6. Confirm import

**Export to CSV:**
1. Click **"Export CSV"** button
2. Select export fields
3. Download CSV file

**Generate Equipment Labels:**
1. Select equipment items (checkbox)
2. Click **"Generate Labels"** button
3. Print QR code labels
4. Attach to physical equipment

---

### Request Management

**Accessing Requests:**

1. Navigate to **Menu → Manage Requests**
2. View all user requests

**Request List Views:**

- **All Requests:** Complete list
- **Pending:** Awaiting your approval
- **Approved:** Approved and active
- **Rejected:** Declined requests
- **Completed:** Returned equipment

**Reviewing Requests:**

1. Click on any request to view details
2. Review request information:
   - User details
   - Requested items and quantities
   - Reason and destination
   - Expected duration
   - Team members
3. Check equipment availability

**Approving Requests:**

1. Open request details
2. Click **"Approve"** button
3. Set due date (return deadline)
4. Add admin notes (optional)
5. Click **"Confirm Approval"**

**Actions on Approval:**
- Equipment available quantity decreases
- User receives approval notification
- Google Chat webhook sent (if configured)
- Due date reminder scheduled

**Rejecting Requests:**

1. Open request details
2. Click **"Reject"** button
3. **Required:** Provide rejection reason in admin notes
4. Click **"Confirm Rejection"**

**Actions on Rejection:**
- Request status changes to "Rejected"
- User receives notification with reason
- Equipment remains available

**Bulk Actions:**

- Select multiple requests (checkboxes)
- Use bulk action dropdown:
  - Approve All
  - Reject All
  - Export Selected

---

### Check-In Management

**Accessing Check-Ins:**

1. Navigate to **Menu → Manage Check-Ins**
2. View all check-in activities

**Viewing Check-In Details:**

Click any check-in record to see:
- User information
- Equipment details
- Action (check-in or check-out)
- Condition report
- Photos (if damage reported)
- Location
- Timestamp

**Verifying Check-Ins:**

1. Review condition report
2. Check for damage photos
3. If damaged:
   - Contact user for details
   - Update equipment status to "Under Repair"
   - Create maintenance record
4. Approve check-in (automatic unless flagged)

---

### User Management

**Accessing User Management:**

1. Navigate to **Menu → Manage Users**
2. View all registered users

**User List Information:**

- Full name
- Email address
- Department
- Role (Admin/User)
- Status (Active/Inactive/Suspended)
- Registration date
- Last login

**Viewing User Details:**

1. Click on any user
2. See complete user profile
3. View user activity:
   - Total requests
   - Equipment currently checked out
   - Request history
   - Check-in/out history

**Editing User Roles:**

1. Open user details
2. Click **"Edit Role"**
3. Select new role:
   - **User:** Standard access
   - **Admin:** Full system access
4. Confirm role change
5. **Warning:** Use admin role sparingly for security

**Managing User Status:**

**Suspend User:**
1. Open user details
2. Click **"Suspend User"**
3. Provide reason
4. Confirm suspension
5. User cannot log in while suspended

**Activate User:**
1. Find suspended user
2. Click **"Activate User"**
3. User can log in again

**Ban User:**
1. Open user details
2. Click **"Ban User"**
3. Confirm permanent ban
4. User permanently blocked

---

### Announcements

**Creating Announcements:**

1. Navigate to **Menu → Announcements**
2. Click **"+ New Announcement"** button
3. Fill announcement form:
   - **Title:** Clear, concise headline
   - **Content:** Announcement details (supports Markdown)
   - **Priority:** High, Medium, Low
   - **Expiration Date:** When announcement should hide (optional)
4. Click **"Publish"**

**Announcement Display:**

- Appears on all user dashboards
- Shown on login page (for important announcements)
- Sent as notification to all users

**Managing Announcements:**

- **Edit:** Modify existing announcements
- **Delete:** Remove announcements
- **Archive:** Keep for records but hide from users

---

### Reports & Analytics

**Accessing Reports:**

1. Navigate to **Menu → Reports & Analytics**
2. View available report types

**Weekly Activity Report:**

1. Click **"Weekly Activity Report"**
2. Select date range
3. Generate report
4. View metrics:
   - Total requests
   - Approval rate
   - Check-in/out activity
   - Most active users
   - Popular equipment
   - Equipment utilization rates
5. Export as PDF or CSV

**Equipment Utilization Report:**

Shows how efficiently equipment is being used:
- Equipment name
- Total available days
- Days checked out
- Utilization percentage
- Revenue potential (if applicable)

**User Activity Report:**

Track user engagement:
- Active users
- Inactive users
- Request patterns
- Average duration per user
- Department breakdowns

**Custom Reports:**

1. Click **"Custom Report"**
2. Select metrics to include
3. Set filters (date range, departments, equipment categories)
4. Generate report
5. Save report template for reuse

---

## Features & Workflows

### Real-Time Updates

Nest uses real-time synchronization to keep all users updated instantly.

**Real-Time Features:**

1. **Dashboard Statistics:** Update without page refresh
2. **Equipment Availability:** Reflects changes immediately
3. **Request Status:** Updates shown in real-time
4. **Notifications:** Delivered instantly
5. **Activity Feed:** New activities appear automatically

**How It Works:**

- WebSocket connection to Supabase Realtime
- Automatic fallback to polling if WebSocket unavailable
- Minimal battery impact on mobile devices

---

### QR Code System

**What are QR Codes:**

- 2D barcodes attached to physical equipment
- Scannable with smartphone camera
- Unique identifier for each equipment item

**Generating QR Codes:**

**Admin Process:**
1. Go to **Manage Gears**
2. Select equipment items
3. Click **"Generate Labels"**
4. Print QR code labels
5. Attach to equipment

**Using QR Codes:**

**For Check-Out:**
1. Open check-out page
2. Click **"Scan QR Code"**
3. Point camera at QR code
4. System auto-fills equipment details
5. Confirm check-out

**For Check-In:**
1. Open check-in page
2. Click **"Scan QR Code"**
3. Scan equipment QR code
4. Fill condition form
5. Submit check-in

---

### Notification System

**Notification Triggers:**

| Event | Recipient | Type |
|-------|-----------|------|
| New request submitted | Admin | Info |
| Request approved | User | Success |
| Request rejected | User | Error |
| Equipment checked out | User | Success |
| Equipment checked in | User, Admin | Success |
| Equipment overdue | User, Admin | Warning |
| New announcement | All users | Info |

**Notification Channels:**

1. **In-App:** Notification center (bell icon)
2. **Email:** Sent to user's registered email (optional)
3. **Google Chat:** Admin alerts via webhook

---

### Search & Filters

**Global Search:**

Use the search bar in the navigation:
- Searches equipment names and descriptions
- Searches user names (admin only)
- Searches request IDs

**Advanced Filters:**

Available on list pages (equipment, requests, users):
- Multiple filter criteria
- Date range selection
- Status filters
- Category filters
- Combine filters for precise results

---

### CSV Import/Export

**Exporting Data:**

1. Navigate to list page (equipment, requests, users)
2. Apply desired filters
3. Click **"Export CSV"** button
4. Select fields to include
5. Download CSV file

**Use Cases:**
- Backup data
- Offline analysis
- Integration with other systems
- Report generation

**Importing Equipment:**

1. Download CSV template
2. Fill template with equipment data
3. Ensure correct format:
   - Required fields: name, category, quantity
   - Optional fields: description, serial_number, etc.
4. Upload CSV file
5. Review import preview
6. Fix any validation errors
7. Confirm import

---

## Mobile Usage

### Mobile-Optimized Features

Nest is fully responsive and optimized for mobile devices.

**Mobile Navigation:**

- Hamburger menu (≡) for navigation
- Bottom navigation bar for quick access
- Swipe gestures for actions

**Mobile-Specific Features:**

1. **QR Code Scanning:** Use phone camera
2. **Photo Upload:** Access phone camera for damage reports
3. **Push Notifications:** Browser notifications on mobile
4. **Offline Mode:** View cached data when offline
5. **Add to Home Screen:** Install as Progressive Web App (PWA)

---

### Installing as PWA (Progressive Web App)

**On iOS (iPhone/iPad):**

1. Open Nest in Safari
2. Tap **Share** button (square with up arrow)
3. Scroll and tap **"Add to Home Screen"**
4. Name the app "Nest"
5. Tap **"Add"**
6. Nest icon appears on home screen

**On Android:**

1. Open Nest in Chrome
2. Tap **Menu** (⋮) in top-right
3. Tap **"Add to Home screen"**
4. Confirm app name
5. Tap **"Add"**
6. App appears on home screen

**PWA Benefits:**

- Full-screen experience (no browser UI)
- App-like feel
- Faster loading (cached assets)
- Offline capability
- Push notifications

---

## Troubleshooting

### Common Issues & Solutions

#### Cannot Log In

**Symptoms:** Login fails with error message

**Solutions:**

1. **Verify Credentials:**
   - Check email address (case-insensitive)
   - Ensure password is correct (case-sensitive)
   - Try "Forgot Password" to reset

2. **Account Not Verified:**
   - Check email for verification link
   - Click verification link
   - Resend verification email if needed

3. **Account Suspended:**
   - Contact administrator
   - Check email for suspension notification

4. **Browser Issues:**
   - Clear browser cache and cookies
   - Try different browser
   - Disable browser extensions

---

#### Equipment Not Appearing

**Symptoms:** Cannot find equipment in browse page

**Solutions:**

1. **Check Filters:**
   - Ensure "All Categories" is selected
   - Clear search bar
   - Reset all filters

2. **Equipment Status:**
   - Equipment may be "Retired" (hidden from users)
   - Check with administrator

3. **Permission Issues:**
   - Log out and log back in
   - Verify account is active

---

#### Request Not Updating

**Symptoms:** Request status stuck on "Pending"

**Solutions:**

1. **Refresh Page:**
   - Press F5 or click refresh button
   - Wait a few seconds for real-time sync

2. **Check with Admin:**
   - Admin may not have reviewed yet
   - Send polite reminder via notification

3. **Clear Cache:**
   - Clear browser cache
   - Log out and log back in

---

#### QR Code Scanner Not Working

**Symptoms:** Camera doesn't open or QR code not recognized

**Solutions:**

1. **Camera Permissions:**
   - Allow camera access in browser settings
   - Check browser permission prompt
   - Try different browser

2. **Lighting Conditions:**
   - Ensure good lighting
   - Avoid glare on QR code
   - Hold phone steady

3. **QR Code Quality:**
   - Ensure QR code is not damaged
   - Print new label if needed
   - Use manual entry as fallback

---

#### Slow Performance

**Symptoms:** Pages load slowly or freeze

**Solutions:**

1. **Internet Connection:**
   - Check WiFi/mobile data connection
   - Try different network
   - Close bandwidth-heavy apps

2. **Browser Resources:**
   - Close other browser tabs
   - Restart browser
   - Update browser to latest version

3. **Device Performance:**
   - Restart device
   - Close background apps
   - Clear storage space

---

#### Notifications Not Received

**Symptoms:** Missing notification for approved request

**Solutions:**

1. **Check Notification Center:**
   - Click bell icon to view all notifications
   - Scroll to see older notifications

2. **Browser Notifications:**
   - Enable browser notifications in settings
   - Allow notifications for Nest website

3. **Email Notifications:**
   - Check spam/junk folder
   - Verify email address in profile
   - Contact admin to enable email notifications

---

### Getting Help

**In-App Support:**

1. Click **"Help"** in navigation menu
2. Search knowledge base
3. View tutorial videos
4. Submit support ticket

**Contact Support:**

- **Email:** support@edenoasis.com
- **Response Time:** Within 24 hours
- **Include:** Screenshots, error messages, steps to reproduce

**Admin Support:**

Contact your organization's admin users first for:
- Account issues
- Permission problems
- General usage questions

---

## FAQ

### General Questions

**Q: Is Nest free to use?**  
A: Contact your organization's IT department for licensing information.

**Q: Can I access Nest from my phone?**  
A: Yes, Nest is fully mobile-responsive and can be installed as a PWA.

**Q: How long can I keep equipment checked out?**  
A: Duration is set by the admin when approving your request. Check your request details for the due date.

**Q: What happens if I return equipment late?**  
A: You'll receive overdue notifications. Repeated late returns may affect future request approvals.

---

### Equipment Questions

**Q: How do I know if equipment is available?**  
A: Browse the equipment catalog and check the availability badge. Green badge means available.

**Q: Can I request equipment that's currently checked out?**  
A: Yes, submit a request. If approved, you'll be notified when the equipment becomes available.

**Q: Can I extend my rental period?**  
A: Submit a new request or contact the admin to extend your due date.

**Q: What if equipment is damaged during my usage?**  
A: Report damage during check-in with photos and detailed notes. Admin will assess the situation.

---

### Request Questions

**Q: How long does approval take?**  
A: Typically within 24 hours. Urgent requests should be communicated directly to admin.

**Q: Can I edit my request after submission?**  
A: Yes, you can edit pending requests before admin approval.

**Q: Why was my request rejected?**  
A: Check admin notes in your request details for the specific reason. Common reasons include equipment unavailability or insufficient reason.

**Q: Can I request multiple items at once?**  
A: Yes, add multiple equipment items to a single request.

---

### Technical Questions

**Q: Which browsers are supported?**  
A: Chrome, Firefox, Safari, and Edge (latest versions).

**Q: Is my data secure?**  
A: Yes, all data is encrypted in transit (HTTPS) and at rest. Access is controlled by Row-Level Security policies.

**Q: Can I use Nest offline?**  
A: Limited offline functionality via PWA. Some features require internet connection.

**Q: How do I report a bug?**  
A: Click "Help" → "Report Bug" or email support@edenoasis.com with details.

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Daniel Chinonso Samuel | Initial user manual |

---

**For Additional Support:**

Visit: https://docs.nest-edenoasis.com  
Email: support@edenoasis.com  
Community Forum: https://community.nest-edenoasis.com
