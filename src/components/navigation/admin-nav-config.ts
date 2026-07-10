import type { LucideIcon } from "lucide-react";
import {
    BarChart3,
    Bell,
    BusFront,
    Car,
    ClipboardCheck,
    LayoutDashboard,
    ListChecks,
    Mail,
    Megaphone,
    Package,
    Settings,
    UserCog,
} from "lucide-react";

export interface AdminNavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

export interface AdminNavGroup {
    label: string;
    items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
    {
        label: "Overview",
        items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Equipment",
        items: [
            { href: "/admin/manage-gears", label: "Manage gears", icon: Package },
            { href: "/admin/manage-requests", label: "Manage requests", icon: ListChecks },
            { href: "/admin/manage-checkins", label: "Manage check-ins", icon: ClipboardCheck },
        ],
    },
    {
        label: "Fleet",
        items: [
            { href: "/admin/manage-car-bookings", label: "Car bookings", icon: Car },
            { href: "/admin/live-bus", label: "Live bus", icon: BusFront },
        ],
    },
    {
        label: "People",
        items: [
            { href: "/admin/manage-users", label: "Manage users", icon: UserCog },
            { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
            { href: "/admin/release-notes", label: "Release notes", icon: Mail },
            { href: "/admin/notifications", label: "Notifications", icon: Bell },
        ],
    },
    {
        label: "Insights",
        items: [{ href: "/admin/reports", label: "Reports & analytics", icon: BarChart3 }],
    },
    {
        label: "System",
        items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
    },
];

export function isAdminNavActive(pathname: string, href: string) {
    if (href === "/admin/dashboard") {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}
