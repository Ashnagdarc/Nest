-- =============================================================================
-- Purpose (H-11): Expand stale status CHECK constraints to match app / RPCs
--
-- APPLY ORDER: 2 of 3 in series 20260923140*
--   After 20260923140000_drop_gears_holder_update_policy.sql
--   Before 20260923140200_car_booking_overlap_only_lock.sql
--   Shared STAGING CHECKLIST: see header of 20260923140000_*.sql
--
-- Problem:
--   Early CREATE TABLE migrations defined narrow CHECKs:
--     gear_requests: Pending|Approved|Rejected|Completed|Cancelled
--     checkins:      Pending|Approved|Rejected|Completed
--   Later code writes:
--     gear_requests: Checked Out, Overdue, Partially Checked Out
--     checkins:      Pending Admin Approval
--   No prior migration expands those CHECKs. Live DB may have (a) no CHECK,
--   (b) stale CHECK that rejects writes, or (c) already-expanded CHECK.
--
-- Safety:
--   This migration EXPANDS only (superset). It never removes allowed values.
--   It aborts if any existing row has a status outside the expanded allowlist
--   (so we do not lock out unknown production values blindly).
--   gears.status has no CHECK in-repo — left untouched.
--
-- Rollback:
--   Re-apply the previous narrower CHECK only after confirming no rows use the
--   expanded values (unsafe in production that already wrote them). Prefer
--   leave expanded. Post-apply verify: constraint names gear_requests_status_check
--   / checkins_status_check exist and defs include the expanded literals.
--
-- DO NOT auto-apply to remote:
--   1) Run the verification SQL below in the SQL editor (read-only).
--   2) Confirm unexpected-status counts are 0 (or triage outliers first).
--   3) Then apply this file manually after 40000. Do not `supabase db push`
--      / MCP apply_migration blindly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- HUMAN VERIFICATION (read-only — run before apply)
-- -----------------------------------------------------------------------------
-- -- Existing CHECKs on status columns
-- SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
-- FROM pg_constraint c
-- JOIN pg_class t ON t.oid = c.conrelid
-- JOIN pg_namespace n ON n.oid = t.relnamespace
-- WHERE n.nspname = 'public'
--   AND t.relname IN ('gear_requests', 'checkins')
--   AND c.contype = 'c'
--   AND pg_get_constraintdef(c.oid) ILIKE '%status%';
--
-- -- Unexpected statuses (must be 0 before apply, or expand allowlist further)
-- SELECT status, COUNT(*) FROM public.gear_requests
-- GROUP BY 1 ORDER BY 2 DESC;
-- SELECT status, COUNT(*) FROM public.checkins
-- GROUP BY 1 ORDER BY 2 DESC;
--
-- SELECT COUNT(*) AS unexpected_gear_requests
-- FROM public.gear_requests
-- WHERE status IS NOT NULL
--   AND status NOT IN (
--     'Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled',
--     'Checked Out', 'Overdue', 'Partially Checked Out'
--   );
--
-- SELECT COUNT(*) AS unexpected_checkins
-- FROM public.checkins
-- WHERE status IS NOT NULL
--   AND status NOT IN (
--     'Pending', 'Approved', 'Rejected', 'Completed',
--     'Pending Admin Approval'
--   );

DO $$
DECLARE
  v_unexpected integer;
  v_conname text;
BEGIN
  -- Abort if unknown gear_requests statuses would be rejected by the new CHECK
  SELECT COUNT(*) INTO v_unexpected
  FROM public.gear_requests
  WHERE status IS NOT NULL
    AND status NOT IN (
      'Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled',
      'Checked Out', 'Overdue', 'Partially Checked Out'
    );

  IF v_unexpected > 0 THEN
    RAISE EXCEPTION
      'H-11 abort: % gear_requests row(s) have status outside expanded allowlist — triage before applying',
      v_unexpected;
  END IF;

  -- Drop any existing CHECK that mentions status (name may vary)
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'gear_requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.gear_requests DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.gear_requests
    ADD CONSTRAINT gear_requests_status_check
    CHECK (
      status IN (
        'Pending',
        'Approved',
        'Rejected',
        'Completed',
        'Cancelled',
        'Checked Out',
        'Overdue',
        'Partially Checked Out'
      )
    );
END $$;

DO $$
DECLARE
  v_unexpected integer;
  v_conname text;
BEGIN
  SELECT COUNT(*) INTO v_unexpected
  FROM public.checkins
  WHERE status IS NOT NULL
    AND status NOT IN (
      'Pending', 'Approved', 'Rejected', 'Completed',
      'Pending Admin Approval'
    );

  IF v_unexpected > 0 THEN
    RAISE EXCEPTION
      'H-11 abort: % checkins row(s) have status outside expanded allowlist — triage before applying',
      v_unexpected;
  END IF;

  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'checkins'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.checkins
    ADD CONSTRAINT checkins_status_check
    CHECK (
      status IN (
        'Pending',
        'Approved',
        'Rejected',
        'Completed',
        'Pending Admin Approval'
      )
    );
END $$;
