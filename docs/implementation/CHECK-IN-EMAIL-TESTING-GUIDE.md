# Check-in Email Testing Guide

## 🧪 Complete Testing Checklist

### Prerequisites

- [ ] Dev server running: `npm run dev`
- [ ] Database accessible
- [ ] Email service configured (Resend API key)
- [ ] Test user account created
- [ ] Test admin account created

---

## 1️⃣ User Check-in Submission

### Test Case 1.1: Normal Check-in (Good Condition)

**Steps:**

1. Login as regular user
2. Navigate to `/user/check-in`
3. Select a checked-out item
4. Set condition: "Good"
5. Add optional notes: "Item returned in excellent condition"
6. Click "Submit Check-in"

**Expected Results:**

- ✅ Success toast appears
- ✅ Check-in created in database (`status: 'Pending Admin Approval'`)
- ✅ Gear status updated to `'Pending Check-in'`
- ✅ **User receives confirmation email:**
  - Subject: "✅ Check-in Submitted - Pending Approval"
  - Contains: Item name, condition, notes
  - CTA: "View Check-in History"
- ✅ **All admins receive notification email:**
  - Subject: "🔄 New Check-in Pending Approval - {User Name}"
  - Contains: User name, item name, condition, notes
  - CTA: "Review Check-in"
- ✅ In-app notifications created for admins
- ✅ Google Chat webhook sent

**Check Logs:**

```bash
# Should see:
[Check-in Notify] ✅ User email sent to: user@example.com
[Check-in Notify] ✅ Admin email sent to: admin1@example.com
[Check-in Notify] ✅ Admin email sent to: admin2@example.com
```

---

### Test Case 1.2: Check-in with Damage Report

**Steps:**

1. Login as regular user
2. Navigate to `/user/check-in`
3. Select a checked-out item
4. Set condition: "Damaged"
5. Add damage description: "Screen has minor scratches"
6. Add notes: "Dropped accidentally"
7. Click "Submit Check-in"

**Expected Results:**

- ✅ All results from Test 1.1 PLUS:
- ✅ User email highlights damage notes in red
- ✅ Admin emails highlight damage with ⚠️ warning icon
- ✅ Damage notes clearly visible in both emails

**Email Content Check:**

```
User Email:
┌─────────────────────────────┐
│ Damage Notes: [RED]         │
│ Screen has minor scratches  │
└─────────────────────────────┘

Admin Email:
┌─────────────────────────────┐
│ ⚠️ Damage Reported: [RED]   │
│ Screen has minor scratches  │
└─────────────────────────────┘
```

---

### Test Case 1.3: User with Email Disabled

**Steps:**

1. Update test user's notification preferences:
   ```sql
   UPDATE profiles
   SET notification_preferences = '{"email": {"gear_checkins": false}}'::jsonb
   WHERE id = '<test-user-id>';
   ```
2. Submit check-in (follow Test 1.1 steps)

**Expected Results:**

- ✅ Check-in created successfully
- ❌ User does NOT receive email
- ✅ Admins still receive notification emails
- ✅ In-app notifications still work
- ✅ Google Chat webhook still sent

**Check Logs:**

```bash
# Should see:
[Check-in Notify] User email preferences disabled
[Check-in Notify] ✅ Admin email sent to: admin1@example.com
```

---

## 2️⃣ Admin Approval Flow

### Test Case 2.1: Approve Check-in

**Steps:**

1. Login as admin
2. Navigate to `/admin/manage-checkins`
3. Find pending check-in from Test 1.1
4. Click "Approve" button
5. Confirm approval

**Expected Results:**

- ✅ Check-in status updated to `'Completed'`
- ✅ Gear status auto-updated to `'Available'` (via DB trigger)
- ✅ Success toast appears
- ✅ **User receives approval email:**
  - Subject: "✅ Check-in Approved!"
  - Contains: Item name, condition, return date
  - Green gradient header
  - CTA: "View History"
- ✅ **All admins receive action notification:**
  - Subject: "✅ Check-in Approved - {User Name}"
  - Contains: User name, item name, status
  - Admin action log format
- ✅ In-app notification sent to user
- ✅ Google Chat webhook sent

**Check Logs:**

```bash
# Should see:
[Check-in Approve] ✅ User approval email sent to: user@example.com
[Check-in Approve] ✅ Admin email sent to: admin1@example.com
[Check-in Approve] ✅ Admin email sent to: admin2@example.com
```

---

### Test Case 2.2: Approve All Items in Request

**Steps:**

1. Create gear request with 3 items
2. Check out all 3 items
3. Submit check-ins for all 3 items
4. Approve first check-in → Request status should stay 'Active'
5. Approve second check-in → Request status should stay 'Active'
6. Approve third check-in → Request status should change to 'Completed'

**Expected Results:**

- ✅ First approval: Request stays 'Active'
- ✅ Second approval: Request stays 'Active'
- ✅ Third approval: Request updated to 'Completed'
- ✅ All three users receive approval emails
- ✅ Admins notified for each approval

---

## 3️⃣ Admin Rejection Flow

### Test Case 3.1: Reject Check-in with Reason

**Steps:**

1. Login as admin
2. Navigate to `/admin/manage-checkins`
3. Find pending check-in
4. Click "Reject" button
5. Enter reason: "Item condition does not match description. Please recheck and resubmit."
6. Confirm rejection

**Expected Results:**

- ✅ Check-in status updated to `'Rejected'`
- ✅ Gear status reverted to `'Checked Out'`
- ✅ Rejection reason saved in notes
- ✅ **User receives rejection email:**
  - Subject: "❌ Check-in Rejected"
  - Contains: Item name, rejection reason (highlighted)
  - Red gradient header
  - Clear next steps
  - CTA: "Try Again"
- ✅ **All admins receive action notification:**
  - Subject: "❌ Check-in Rejected - {User Name}"
  - Contains: User name, item name, status, reason
- ✅ In-app notification sent to user
- ✅ Google Chat webhook sent

**Check Logs:**

```bash
# Should see:
[Check-in Reject] ✅ User rejection email sent to: user@example.com
[Check-in Reject] ✅ Admin email sent to: admin1@example.com
```

---

### Test Case 3.2: Reject Without Email Preference

**Steps:**

1. Disable user's email notifications
2. Reject check-in (follow Test 3.1 steps)

**Expected Results:**

- ✅ Check-in rejected successfully
- ❌ User does NOT receive email
- ✅ Admins still receive notification emails
- ✅ In-app notifications still work

---

## 4️⃣ Edge Cases

### Test Case 4.1: Missing User Email

**Steps:**

1. Create user without email:
   ```sql
   UPDATE profiles
   SET email = NULL
   WHERE id = '<test-user-id>';
   ```
2. Submit check-in as this user

**Expected Results:**

- ✅ Check-in created successfully
- ✅ Admins receive notification emails
- ⚠️ Log warning: `[Check-in Notify] User not found or no email`
- ✅ Process continues without error

---

### Test Case 4.2: No Active Admins

**Steps:**

1. Deactivate all admin accounts:
   ```sql
   UPDATE profiles
   SET status = 'Inactive'
   WHERE role = 'Admin';
   ```
2. Submit check-in

**Expected Results:**

- ✅ Check-in created successfully
- ✅ User receives confirmation email
- ⚠️ Log message: `[Check-in Notify] Found 0 admins to notify`
- ✅ Process continues without error

**Restore:**

```sql
UPDATE profiles
SET status = 'Active'
WHERE role = 'Admin';
```

---

### Test Case 4.3: Email Service Failure

**Steps:**

1. Temporarily break email config:
   ```bash
   # Set invalid API key
   RESEND_API_KEY=invalid_key_test
   ```
2. Submit check-in

**Expected Results:**

- ✅ Check-in created successfully
- ✅ In-app notifications work
- ✅ Google Chat webhook works
- ❌ Emails fail gracefully
- ⚠️ Log error: `[Check-in Notify] ❌ Failed to send user email`
- ✅ **User workflow NOT blocked**

**Restore:**

```bash
# Set correct API key
RESEND_API_KEY=re_WDkzyPJg_4iPnpK95iAGvtwV2gYKqcbML
```

---

### Test Case 4.4: Multiple Rapid Check-ins

**Steps:**

1. Submit 5 check-ins in rapid succession (< 10 seconds apart)

**Expected Results:**

- ✅ All 5 check-ins created
- ✅ All 5 user confirmation emails sent
- ✅ All 5 admin notification emails sent (per admin)
- ✅ No rate limiting issues
- ✅ All emails arrive in correct order

---

### Test Case 4.5: API Route Not Responding

**Steps:**

1. Stop dev server
2. Submit check-in
3. Check browser console

**Expected Results:**

- ✅ Check-in submitted to database
- ❌ API call fails (network error)
- ✅ Error logged: `Failed to send check-in email notifications`
- ✅ User sees success toast (check-in created)
- ⚠️ But no emails sent

**Note:** This is expected behavior - emails are best-effort, don't block workflow

---

## 5️⃣ Email Content Validation

### Test Case 5.1: Email HTML Rendering

**Check each email in different clients:**

- [ ] Gmail (web)
- [ ] Outlook (web)
- [ ] Apple Mail
- [ ] Gmail (mobile)

**Verify:**

- ✅ Gradient headers display correctly
- ✅ Tables are properly formatted
- ✅ CTAs are clickable and styled
- ✅ Responsive on mobile
- ✅ No broken images
- ✅ Links work correctly

---

### Test Case 5.2: Email Links

**Click all CTAs and verify they work:**

- [ ] "View Check-in History" → `/user/history`
- [ ] "Review Check-in" → `/admin/manage-checkins`
- [ ] "Try Again" → `/user/check-in`
- [ ] "nestbyeden.app" footer link → Homepage

---

## 6️⃣ Performance Testing

### Test Case 6.1: Email Send Time

**Measure time from check-in submit to email received:**

**Steps:**

1. Note time before clicking "Submit Check-in"
2. Click "Submit Check-in"
3. Note time when email arrives in inbox

**Expected Results:**

- ✅ User confirmation email: < 3 seconds
- ✅ Admin notification emails: < 5 seconds
- ✅ Total API response time: < 2 seconds

---

### Test Case 6.2: Multiple Admins Performance

**Steps:**

1. Create 10 admin accounts
2. Submit check-in
3. Verify all 10 admins receive emails

**Expected Results:**

- ✅ All 10 emails sent within 10 seconds
- ✅ No timeout errors
- ✅ All emails delivered successfully

---

## 7️⃣ Database Verification

### Test Case 7.1: Check Database State

**After each test, verify database:**

```sql
-- Check checkin record
SELECT * FROM checkins WHERE id = '<checkin-id>';

-- Check gear status
SELECT status FROM gears WHERE id = '<gear-id>';

-- Check request status (if applicable)
SELECT status FROM gear_requests WHERE id = '<request-id>';

-- Check notifications
SELECT * FROM notifications
WHERE user_id = '<user-id>'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🐛 Common Issues & Solutions

### Issue: Emails not being sent

**Check:**

1. API route called? (DevTools → Network tab)
2. Response: `{ success: true }`?
3. Logs show email attempts?
4. Resend API key valid?
5. User notification preferences enabled?

**Fix:**

```bash
# Verify env
npm run validate-env

# Test email service
npm run test-email

# Check logs
grep -r "Check-in Notify" logs/
```

---

### Issue: User email sent but admins didn't receive

**Check:**

```sql
SELECT email, role, status
FROM profiles
WHERE role = 'Admin';
```

**Verify:**

- Admin accounts have valid emails
- Admin status is 'Active'
- Check spam folders

---

### Issue: Check-in created but no API call

**Check:**

1. Browser console for errors
2. Network tab for failed requests
3. Frontend code has API call

**Fix:**
Verify `/api/checkins/notify` call in check-in page:

```typescript
await fetch('/api/checkins/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});
```

---

## ✅ Final Verification Checklist

### User Flow

- [ ] User can submit check-in
- [ ] User receives confirmation email
- [ ] User can view check-in history
- [ ] User receives approval email
- [ ] User receives rejection email
- [ ] User can disable email notifications

### Admin Flow

- [ ] Admin receives pending notification
- [ ] Admin can approve check-in
- [ ] Admin can reject check-in
- [ ] Admin receives action confirmations
- [ ] Multiple admins all notified

### Technical

- [ ] No TypeScript errors
- [ ] No console errors
- [ ] API routes return 200
- [ ] Logs show successful sends
- [ ] Error handling works
- [ ] Graceful degradation

### Email Quality

- [ ] Professional templates
- [ ] Responsive design
- [ ] Working links
- [ ] Correct branding
- [ ] Clear CTAs
- [ ] Proper formatting

---

## 📊 Testing Summary Template

```
Test Date: _______________
Tester: __________________

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1.1 Normal Check-in | ☐ Pass ☐ Fail | |
| 1.2 Damaged Check-in | ☐ Pass ☐ Fail | |
| 1.3 Email Disabled | ☐ Pass ☐ Fail | |
| 2.1 Approve Check-in | ☐ Pass ☐ Fail | |
| 2.2 Complete Request | ☐ Pass ☐ Fail | |
| 3.1 Reject Check-in | ☐ Pass ☐ Fail | |
| 3.2 Reject No Email | ☐ Pass ☐ Fail | |
| 4.1 Missing Email | ☐ Pass ☐ Fail | |
| 4.2 No Admins | ☐ Pass ☐ Fail | |
| 4.3 Email Failure | ☐ Pass ☐ Fail | |
| 4.4 Rapid Check-ins | ☐ Pass ☐ Fail | |
| 5.1 HTML Rendering | ☐ Pass ☐ Fail | |
| 5.2 Email Links | ☐ Pass ☐ Fail | |

Overall Result: ☐ Ready for Production ☐ Needs Work

Notes:
_________________________________
_________________________________
_________________________________
```

---

**Ready to Test!** 🚀

All test cases above should pass before deployment.
