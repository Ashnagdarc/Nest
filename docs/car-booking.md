# Car Booking MD

## Purpose

Separate car bookings from the general equipment request/checkout flow. Provide a simple sheet-like booking experience for users and an approval workflow for admins, without impacting existing gear logic.

## Objectives

- Users can submit a car booking with: Name, Date of use, Time slot, Destination, Purpose.
- Admins can list, approve, reject, or create bookings on behalf of others.
- No user check-in required for cars.
- Co-exist with current equipment requests; do not change `gears` or `/api/requests/*`.

## Non‑Breaking Strategy

- Additive database schema for cars and bookings.
- New isolated API routes under `/api/car-bookings/*`.
- New UI routes for user and admin.
- Browse page hides `Cars` from equipment grid; adds CTA to the new booking page.

---

## Proposed Data Model (additive)

Table: `car_bookings`

- id uuid PK default uuid_generate_v4()
- requester_id uuid null references profiles(id) on delete set null
- employee_name text not null
- date_of_use date not null
- time_slot text not null            // e.g., "10:00 AM", "12:00‑1:30 PM"
- destination text
- purpose text
- status text not null default 'Pending' check in ('Pending','Approved','Rejected','Cancelled')
- approved_by uuid null references profiles(id)
- approved_at timestamptz null
- rejected_by uuid null references profiles(id)
- rejection_reason text null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Optional table: `cars` (to support asset assignment and calendar clarity)

- id uuid PK default uuid_generate_v4()
- label text not null                // e.g., "ED 01"
- plate text unique null
- active boolean not null default true
- created_at/updated_at timestamptz default now()

Optional table: `car_assignment`

- booking_id uuid PK references car_bookings(id) on delete cascade
- car_id uuid not null references cars(id)
- created_at timestamptz default now()
- Unique: (booking_id)

Indexes (recommended)

- idx_car_bookings_date_status: (date_of_use, status)
- idx_car_bookings_requester: (requester_id)
- idx_car_assignment_car: (car_id)

Soft overlap prevention (DB helper, not hard constraint)

- View or function to list overlapping approved bookings by (date_of_use, time_slot[, car_id])

Hard per‑car overlap (optional, only if we want strict prevention)

- Partial unique index on `(car_id, date_of_use, time_slot)` where status = 'Approved'

Row Level Security (mirrors existing style)

- Users:
  - INSERT: own bookings (requester_id = auth.uid()) or null if allowed via server API
  - SELECT: own bookings OR public fields of their own
  - UPDATE: only when status = 'Pending' and only non‑status fields
- Admins:
  - SELECT/INSERT/UPDATE/DELETE all
- Service Role:
  - Full access for approval/rejection endpoints

---

## API Design (new; isolated)

- POST `/api/car-bookings`
  - body: { employeeName, dateOfUse, timeSlot, destination, purpose }
  - auth: user or admin
  - effect: insert `car_bookings` with status 'Pending' and `requester_id = auth.uid()` (or provided by admin)

- GET `/api/car-bookings`
  - query: page, pageSize, status?, dateFrom?, dateTo?, userId?
  - auth: user (sees own), admin (sees all)
  - returns paginated bookings and overlap flags

- POST `/api/car-bookings/approve`
  - body: { bookingId }
  - auth: admin (service role on server)
  - effect: set `status='Approved'`, `approved_by`, `approved_at`; send notification

- POST `/api/car-bookings/reject`
  - body: { bookingId, reason }
  - auth: admin (service role)
  - effect: set `status='Rejected'`, `rejected_by`, `rejection_reason`; notify

- POST `/api/car-bookings/admin-create` (optional)
  - body: same as create + optional `requesterId`
  - effect: create (Pending) or create+approve when `autoApprove=true`

- POST `/api/car-bookings/assign-car` (optional)
  - body: { bookingId, carId }
  - auth: admin
  - effect: upsert into `car_assignment`; warn on overlap

- GET `/api/car-bookings/calendar` (optional)
  - query: range, status=Approved
  - returns ICS file for managers

---

## UI/UX

User

- Route: `/user/car-booking`
- Components:
  - `components/cars/CarBookingForm.tsx` (sheet-like form)
  - `components/cars/CarBookingList.tsx` (recent bookings)
- Hook: `hooks/cars/useCarBookings.ts`
- Service: `services/car-bookings.ts`
- Validation: disable if existing Pending count exceeds limit (see Rate Limiting)

Admin

- Route: `/admin/manage-car-bookings`
- Components:
  - `components/admin/cars/CarBookingsTable.tsx` (filters: date, status, requester)
  - `components/admin/cars/ApproveRejectDrawer.tsx`
  - `components/admin/cars/AssignCarDialog.tsx` (optional)
- Hook: `hooks/cars/useAdminCarBookings.ts`

Browse page change

- Exclude `'Cars'` category in `user/browse/page.tsx`
- Add CTA to `/user/car-booking`

---

## Business Logic

Approval model

- No quantity tracking or user check-ins.
- Admin may approve multiple users on the same day/time (soft rules).
- If `cars` and assignment are enabled, per‑car overlaps show warnings; admins may override unless hard unique index is enabled.

Status history (audit)

- Append‑only log table (optional: `car_booking_events`) capturing state transitions:
  - booking_id, actor_id, from_status, to_status, reason, metadata, created_at

Notifications (reuse existing)

- On approve: create `notifications` with type 'Approval', link to `/user/car-booking`
- On reject: type 'Rejection' with `rejection_reason`
- Optional reminder day‑before event

Calendar export (ICS)

- Approved bookings → ICS VEVENTs with summary: `${employee_name} - Car Booking`, description includes destination/purpose, organizer is approver, DTSTART uses date/time_slot parsing.

Rate limiting and spam control

- Server-side check before insert: user’s count of `status='Pending'` must be <= N (configurable, default N=2)
- Return a friendly error if exceeded

---

## Observability

- Structured logs on create/approve/reject with bookingId, requesterId, approverId
- Metrics: counts per status/day
- Admin table badges for conflicts and pending counts

---

## Rollout Plan

1. Ship schema migrations (additive only).
2. Deploy new APIs; verify RLS policies.
3. Release user and admin pages behind a simple feature flag.
4. Hide Cars on Browse; add CTA.
5. Pilot with a small group; monitor logs and conflicts.
6. Optional: enable car asset assignment and ICS feed.

---

## Testing Plan

- Unit: API handlers (validation, RLS paths, notifications).
- Integration: create → approve/reject; admin-create; assignment; overlap warnings.
- Security: ensure non-admins cannot approve/reject or view others’ bookings.
- Backward-compat: existing `gears` request/approval continues to function.

---

## Files to Add (proposed)

- SQL: `supabase/migrations/<timestamp>_create_car_bookings.sql`
- API:
  - `src/app/api/car-bookings/route.ts`
  - `src/app/api/car-bookings/approve/route.ts`
  - `src/app/api/car-bookings/reject/route.ts`
  - `src/app/api/car-bookings/admin-create/route.ts` (optional)
  - `src/app/api/car-bookings/assign-car/route.ts` (optional)
  - `src/app/api/car-bookings/calendar/route.ts` (optional)
- Types: `src/types/car-bookings.ts`
- Services: `src/services/car-bookings.ts`
- Hooks: `src/hooks/cars/useCarBookings.ts`, `src/hooks/cars/useAdminCarBookings.ts`
- User UI: `src/app/user/car-booking/page.tsx`, `components/cars/CarBookingForm.tsx`, `components/cars/CarBookingList.tsx`
- Admin UI: `src/app/admin/manage-car-bookings/page.tsx`, `components/admin/cars/*`
- Browse edit: update `src/app/user/browse/page.tsx` to exclude `'Cars'` and add CTA

---

## Risks & Mitigations

- Overlaps causing confusion → default to warnings; enable car assignment + optional hard unique index later.
- Time slot parsing inconsistencies → define and centralize allowed time slot enum.
- ICS accuracy → normalize time zones and slot to start/end times.
