import type { UnifiedDashboardData } from "@/hooks/dashboard/use-unified-dashboard";
import { formatRelativeTimeAgo, formatShortDate } from "@/lib/format/date";

export type AdminAttentionType = "request" | "checkin" | "car_booking";

const MAX_ATTENTION_ITEMS = 8;

export interface AdminAttentionItem {
    id: string;
    type: AdminAttentionType;
    title: string;
    subtitle: string;
    userName: string;
    createdAt: string;
    href: string;
}

export function buildAdminAttentionItems(data: UnifiedDashboardData | null): AdminAttentionItem[] {
    if (!data) return [];

    const profileNameById = new Map(
        (data.users ?? []).map((user) => [user.id, user.full_name || "User"])
    );

    const pendingRequests: AdminAttentionItem[] = (data.requests ?? [])
        .filter((request) => request.status === "Pending")
        .slice(0, 5)
        .map((request) => ({
            id: request.id,
            type: "request",
            title: request.reason || "Gear request",
            subtitle: request.destination ? `Destination: ${request.destination}` : "Awaiting approval",
            userName: request.profiles?.full_name || "Unknown user",
            createdAt: request.created_at,
            href: "/admin/manage-requests",
        }));

    const pendingCheckins: AdminAttentionItem[] = (data.checkins ?? [])
        .filter((checkin) => checkin.status === "Pending Admin Approval")
        .slice(0, 5)
        .map((checkin) => ({
            id: checkin.id,
            type: "checkin",
            title: "Gear check-in approval",
            subtitle: checkin.notes || "Review return condition and quantity",
            userName: profileNameById.get(checkin.user_id) || "Unknown user",
            createdAt: checkin.created_at,
            href: "/admin/manage-checkins",
        }));

    const pendingCarBookings: AdminAttentionItem[] = (data.car_bookings ?? [])
        .filter((booking) => booking.status === "Pending")
        .slice(0, 5)
        .map((booking) => {
            const tripParts = [
                booking.date_of_use ? formatShortDate(booking.date_of_use) : null,
                booking.time_slot?.trim() || null,
            ].filter(Boolean);

            return {
                id: booking.id,
                type: "car_booking",
                title: "Car booking request",
                subtitle: tripParts.length > 0 ? tripParts.join(" · ") : "Awaiting approval",
                userName: booking.employee_name || "Unknown user",
                createdAt: booking.created_at,
                href: "/admin/manage-car-bookings",
            };
        });

    return [...pendingRequests, ...pendingCheckins, ...pendingCarBookings]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_ATTENTION_ITEMS);
}

function formatRelativeTime(timestamp: string): string {
    return formatRelativeTimeAgo(timestamp);
}

export { formatRelativeTime };
