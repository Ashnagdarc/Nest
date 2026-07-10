import { NextResponse } from "next/server";
import { createSupabaseApiClient } from "@/lib/supabase/api-client";
import { computeGearInventoryStats } from "@/lib/gear/inventory-stats";

const STATS_PAGE_SIZE = 1000;

async function fetchGearRowsForStats(supabase: ReturnType<typeof createSupabaseApiClient>) {
    const rows: Array<{
        quantity: number | null;
        available_quantity: number | null;
        status: string | null;
        category: string | null;
    }> = [];

    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from("gears")
            .select("quantity, available_quantity, status, category")
            .order("name")
            .range(offset, offset + STATS_PAGE_SIZE - 1);

        if (error) {
            throw error;
        }

        if (!data?.length) {
            break;
        }

        rows.push(...data);

        if (data.length < STATS_PAGE_SIZE) {
            break;
        }

        offset += STATS_PAGE_SIZE;
    }

    return rows;
}

export async function GET() {
    try {
        const supabase = createSupabaseApiClient(true);
        const gears = await fetchGearRowsForStats(supabase);
        const data = computeGearInventoryStats(gears);

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error("[Gears inventory summary] Error:", error);
        return NextResponse.json(
            { data: null, error: "Failed to load inventory summary" },
            { status: 500 }
        );
    }
}
