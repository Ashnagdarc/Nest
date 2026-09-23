# bookings-v2 — internal lifecycle sync (not a public API)

**Role:** private dual-write / aggregate mirror for the `bookings` (+ items/history) tables.

**UI and product HTTP must use legacy routes only:**

- `/api/requests`
- `/api/car-bookings`
- `/api/checkins`

Do not expose or call a public `/api/v2/bookings` surface. Call `createBookingAggregate` / `transitionBooking` (or `syncBookingTransitionSoft`) from those legacy handlers and internal jobs.

## Write helpers

| Helper | Policy | Typical callers |
| --- | --- | --- |
| `createBookingAggregate` | Hard-fail at call site (create + often rollback legacy) | `POST /api/requests`, `POST /api/car-bookings`, gear approve/reject/cancel when seeding missing aggregate |
| `transitionBooking` | Throws on failure — use when the route must fail closed | Gear cancel, auto-checkin/auto-return jobs |
| `syncBookingTransitionSoft` | Soft-fail: logs and does not throw | Car approve/reject/cancel/complete, check-in approve |

## Dual-write call sites (legacy → v2)

**Create (hard-fail / rollback):**

- `src/app/api/requests/route.ts`
- `src/app/api/car-bookings/route.ts`
- `src/app/api/requests/approve/route.ts` (prepare aggregate before checkout)
- `src/app/api/requests/reject/route.ts`, `src/app/api/requests/cancel/route.ts` (seed if missing)

**Transition:**

- Soft: `car-bookings/{approve,reject,cancel,complete}`, `checkins/approve`
- Hard: `requests/cancel`, `internal/auto-checkin-cars`, `lib/car-bookings/auto-return`

## Source of truth

Legacy tables (`gear_requests`, `car_bookings`, check-ins) remain the product SoT for UI. The `bookings` aggregate mirrors lifecycle for reporting and future cutover — do not drop those tables in this phase.
