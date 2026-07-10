export interface GearInventoryStatsRow {
    quantity?: number | null;
    available_quantity?: number | null;
    status?: string | null;
    category?: string | null;
}

export interface GearInventorySummary {
    total: number;
    available: number;
    checkedOut: number;
    maintenance: number;
}

const CHECKED_OUT_STATUSES = new Set(["Checked Out", "Partially Checked Out", "Partially Available"]);

/** Matches admin dashboard equipment stats in `/api/dashboard/unified`. */
export function computeGearInventoryStats(gears: GearInventoryStatsRow[]): GearInventorySummary {
    const active = gears.filter((gear) => gear.status !== "Deleted" && gear.category !== "Cars");

    const total = active.reduce((sum, gear) => sum + (gear.quantity ?? 0), 0);

    const checkedOut = active
        .filter((gear) => CHECKED_OUT_STATUSES.has(gear.status || "Available"))
        .reduce((sum, gear) => {
            const totalQuantity = gear.quantity ?? 1;
            const availableQuantity = gear.available_quantity ?? totalQuantity;
            return sum + Math.max(0, totalQuantity - availableQuantity);
        }, 0);

    const available = Math.max(0, total - checkedOut);

    const maintenance = active
        .filter((gear) => gear.status === "Damaged" || gear.status === "Under Repair")
        .reduce((sum, gear) => sum + (gear.quantity ?? 0), 0);

    return { total, available, checkedOut, maintenance };
}
