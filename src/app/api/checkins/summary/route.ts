import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { requireActiveAdmin } from "@/app/api/_utils/route-auth";

export async function GET() {
    try {
        const authContext = await requireActiveAdmin();
        if ("errorResponse" in authContext) {
            return authContext.errorResponse;
        }

        const supabase = authContext.adminSupabase;
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();

        const [pendingRes, completedTodayRes, damagedRes, totalRes] = await Promise.all([
            supabase
                .from("checkins")
                .select("*", { count: "exact", head: true })
                .eq("status", "Pending Admin Approval"),
            supabase
                .from("checkins")
                .select("*", { count: "exact", head: true })
                .eq("status", "Completed")
                .gte("checkin_date", todayStart)
                .lte("checkin_date", todayEnd),
            supabase
                .from("checkins")
                .select("*", { count: "exact", head: true })
                .eq("condition", "Damaged"),
            supabase.from("checkins").select("*", { count: "exact", head: true }),
        ]);

        const firstError =
            pendingRes.error || completedTodayRes.error || damagedRes.error || totalRes.error;
        if (firstError) throw firstError;

        return NextResponse.json({
            data: {
                pending: pendingRes.count ?? 0,
                completedToday: completedTodayRes.count ?? 0,
                damaged: damagedRes.count ?? 0,
                total: totalRes.count ?? 0,
            },
            error: null,
        });
    } catch (error) {
        console.error("[Checkins summary] Error:", error);
        return NextResponse.json(
            { data: null, error: "Failed to load check-in summary" },
            { status: 500 }
        );
    }
}
