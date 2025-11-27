/**
 * Canonical Gear Status Constants
 * 
 * Single source of truth for all gear status values used throughout the application.
 * These match the database constraints and should be used in all status comparisons.
 * 
 * @fileoverview Centralized gear status constants
 * @author Nest Admin Dashboard Fix
 * @version 1.0.0
 * @since 2025-11-27
 */

export const GearStatus = {
  AVAILABLE: 'Available',
  CHECKED_OUT: 'Checked Out',
  PARTIALLY_CHECKED_OUT: 'Partially Checked Out',
  PARTIALLY_AVAILABLE: 'Partially Available',
  UNDER_REPAIR: 'Under Repair',
  NEEDS_REPAIR: 'Needs Repair',
  MAINTENANCE: 'Maintenance',
  RETIRED: 'Retired',
  LOST: 'Lost',
  PENDING_CHECKIN: 'Pending Check-in',
  NEW: 'New',
  DAMAGED: 'Damaged',
} as const;

export type GearStatusType = typeof GearStatus[keyof typeof GearStatus];

/**
 * Maps common status variants to their canonical form
 * Handles case variations, spacing, and underscore/hyphen differences
 */
const STATUS_VARIANT_MAP: Record<string, GearStatusType> = {
  // Canonical forms (pass through)
  'Available': GearStatus.AVAILABLE,
  'Checked Out': GearStatus.CHECKED_OUT,
  'Partially Checked Out': GearStatus.PARTIALLY_CHECKED_OUT,
  'Partially Available': GearStatus.PARTIALLY_AVAILABLE,
  'Under Repair': GearStatus.UNDER_REPAIR,
  'Needs Repair': GearStatus.NEEDS_REPAIR,
  'Maintenance': GearStatus.MAINTENANCE,
  'Retired': GearStatus.RETIRED,
  'Lost': GearStatus.LOST,
  'Pending Check-in': GearStatus.PENDING_CHECKIN,
  'New': GearStatus.NEW,
  'Damaged': GearStatus.DAMAGED,
  
  // Common variants (normalize to canonical)
  'CheckedOut': GearStatus.CHECKED_OUT,
  'checkedout': GearStatus.CHECKED_OUT,
  'checked-out': GearStatus.CHECKED_OUT,
  'checked_out': GearStatus.CHECKED_OUT,
  'CHECKED_OUT': GearStatus.CHECKED_OUT,
  
  'PartiallyCheckedOut': GearStatus.PARTIALLY_CHECKED_OUT,
  'partiallycheckedout': GearStatus.PARTIALLY_CHECKED_OUT,
  'partially-checked-out': GearStatus.PARTIALLY_CHECKED_OUT,
  'partially_checked_out': GearStatus.PARTIALLY_CHECKED_OUT,
  
  'PartiallyAvailable': GearStatus.PARTIALLY_AVAILABLE,
  'partiallyavailable': GearStatus.PARTIALLY_AVAILABLE,
  'partially-available': GearStatus.PARTIALLY_AVAILABLE,
  'partially_available': GearStatus.PARTIALLY_AVAILABLE,
  
  'UnderRepair': GearStatus.UNDER_REPAIR,
  'underrepair': GearStatus.UNDER_REPAIR,
  'under-repair': GearStatus.UNDER_REPAIR,
  'under_repair': GearStatus.UNDER_REPAIR,
  
  'NeedsRepair': GearStatus.NEEDS_REPAIR,
  'needsrepair': GearStatus.NEEDS_REPAIR,
  'needs-repair': GearStatus.NEEDS_REPAIR,
  'needs_repair': GearStatus.NEEDS_REPAIR,
  
  'PendingCheckin': GearStatus.PENDING_CHECKIN,
  'pendingcheckin': GearStatus.PENDING_CHECKIN,
  'pending-checkin': GearStatus.PENDING_CHECKIN,
  'pending_checkin': GearStatus.PENDING_CHECKIN,
  'Pending Checkin': GearStatus.PENDING_CHECKIN,
  
  // Lowercase variants
  'available': GearStatus.AVAILABLE,
  'maintenance': GearStatus.MAINTENANCE,
  'retired': GearStatus.RETIRED,
  'lost': GearStatus.LOST,
  'new': GearStatus.NEW,
  'damaged': GearStatus.DAMAGED,
};

/**
 * Normalizes a gear status string to its canonical form
 * 
 * @param status - The status string to normalize (may be from UI, API, or DB)
 * @returns The canonical status string, or the original if no mapping exists
 * 
 * @example
 * normalizeGearStatus('CheckedOut') // returns 'Checked Out'
 * normalizeGearStatus('checked-out') // returns 'Checked Out'
 * normalizeGearStatus('Checked Out') // returns 'Checked Out'
 */
export function normalizeGearStatus(status: string | null | undefined): string {
  if (!status) return GearStatus.AVAILABLE;
  
  const trimmed = status.trim();
  
  // Direct lookup first (fastest path)
  if (STATUS_VARIANT_MAP[trimmed]) {
    return STATUS_VARIANT_MAP[trimmed];
  }
  
  // Case-insensitive fallback
  const lowerStatus = trimmed.toLowerCase();
  const matchingKey = Object.keys(STATUS_VARIANT_MAP).find(
    key => key.toLowerCase() === lowerStatus
  );
  
  if (matchingKey) {
    return STATUS_VARIANT_MAP[matchingKey];
  }
  
  // Log unknown status in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[GearStatus] Unknown status encountered: "${status}". Using as-is.`);
  }
  
  return trimmed;
}

/**
 * Checks if a status indicates the gear is checked out
 */
export function isCheckedOut(status: string | null | undefined): boolean {
  const normalized = normalizeGearStatus(status);
  return normalized === GearStatus.CHECKED_OUT || 
         normalized === GearStatus.PARTIALLY_CHECKED_OUT;
}

/**
 * Checks if a status indicates the gear is available (fully or partially)
 */
export function isAvailable(status: string | null | undefined): boolean {
  const normalized = normalizeGearStatus(status);
  return normalized === GearStatus.AVAILABLE || 
         normalized === GearStatus.PARTIALLY_AVAILABLE;
}

/**
 * Checks if a status indicates the gear needs maintenance or repair
 */
export function needsMaintenance(status: string | null | undefined): boolean {
  const normalized = normalizeGearStatus(status);
  return normalized === GearStatus.UNDER_REPAIR || 
         normalized === GearStatus.NEEDS_REPAIR ||
         normalized === GearStatus.MAINTENANCE;
}
