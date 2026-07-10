/** Shared types and availability helpers for the equipment browse page. */

export interface BrowseGear {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    status?: string | null;
    image_url?: string | null;
    quantity?: number | null;
    available_quantity?: number | null;
    checked_out_to?: string | null;
    due_date?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export type AvailabilityLevel = "available" | "partial" | "booked" | "unavailable";

export interface GearAvailability {
    level: AvailabilityLevel;
    label: string;
    total: number;
    available: number;
    booked: number;
    requestable: boolean;
}

const OUT_OF_SERVICE_STATUSES = new Set(["Under Repair", "Maintenance", "Damaged", "Retired"]);

/**
 * Derives what to show for a gear's availability from its status and unit counts.
 * `available_quantity` is the source of truth for how many units can be requested;
 * the difference from `quantity` is what's currently booked/checked out.
 */
export function getGearAvailability(gear: BrowseGear): GearAvailability {
    const total = Math.max(0, gear.quantity ?? 1);
    const available = Math.min(total, Math.max(0, gear.available_quantity ?? 0));
    const booked = total - available;

    if (gear.status && OUT_OF_SERVICE_STATUSES.has(gear.status)) {
        return { level: "unavailable", label: gear.status, total, available: 0, booked, requestable: false };
    }
    if (available === 0) {
        return { level: "booked", label: "Fully Booked", total, available, booked, requestable: false };
    }
    if (booked > 0) {
        return { level: "partial", label: `${available} of ${total} available`, total, available, booked, requestable: true };
    }
    return { level: "available", label: "Available", total, available, booked, requestable: true };
}
