import type { LucideIcon } from "lucide-react";
import {
    Bell,
    BusFront,
    Car,
    History,
    LayoutDashboard,
    ListChecks,
    Megaphone,
    PlusSquare,
    Search,
    Settings,
    UploadCloud,
} from "lucide-react";

export interface UserNavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

export interface UserNavGroup {
    label: string;
    items: UserNavItem[];
}

export const userNavGroups: UserNavGroup[] = [
    {
        label: "Overview",
        items: [{ href: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Equipment",
        items: [
            { href: "/user/browse", label: "Browse Gears", icon: Search },
            { href: "/user/request", label: "Request Gear", icon: PlusSquare },
            { href: "/user/my-requests", label: "My Requests", icon: ListChecks },
            { href: "/user/check-in", label: "Check-in Gear", icon: UploadCloud },
            { href: "/user/history", label: "History", icon: History },
        ],
    },
    {
        label: "Travel",
        items: [
            { href: "/user/car-booking", label: "Book a Car", icon: Car },
            { href: "/user/live-bus", label: "Live Bus", icon: BusFront },
        ],
    },
    {
        label: "Account",
        items: [
            { href: "/user/announcements", label: "Announcements", icon: Megaphone },
            { href: "/user/notifications", label: "Notifications", icon: Bell },
            { href: "/user/settings", label: "Settings", icon: Settings },
        ],
    },
];

export function isUserNavActive(pathname: string, href: string) {
    if (href === "/user/dashboard") {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}
