"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: Record<string, string> = {
    "/": "Home",
    "/login": "Sign in",
    "/signup": "Create account",
    "/forgot-password": "Forgot password",
    "/reset-password": "Reset password",
    "/terms": "Terms of use",
    "/docs": "Documentation",
    "/user/dashboard": "Dashboard",
    "/user/browse": "Browse gears",
    "/user/request": "Request gear",
    "/user/my-requests": "My requests",
    "/user/check-in": "Check-in gear",
    "/user/history": "History",
    "/user/car-booking": "Book a car",
    "/user/announcements": "Announcements",
    "/user/notifications": "Notifications",
    "/user/settings": "Settings",
    "/admin/dashboard": "Admin dashboard",
    "/admin/manage-gears": "Manage gears",
    "/admin/manage-requests": "Manage requests",
    "/admin/manage-checkins": "Manage check-ins",
    "/admin/manage-car-bookings": "Car bookings",
    "/admin/manage-users": "Manage users",
    "/admin/announcements": "Announcements",
    "/admin/release-notes": "Release notes",
    "/admin/notifications": "Notifications",
    "/admin/reports": "Reports",
    "/admin/settings": "Settings",
    "/admin/settings/database": "Database settings",
};

const DOC_TITLES: Record<string, string> = {
    "01-Product-Requirements-Document": "Product requirements",
    "02-Technical-Design-Document": "Technical design",
    "03-API-Documentation": "API documentation",
    "04-User-Manual": "User manual",
    "05-Source-Code-Documentation": "Source code documentation",
    "06-Deployment-Maintenance-Guide": "Deployment guide",
    "07-Release-Notes": "Release notes",
    "08-Process-Documentation": "Process documentation",
    README: "Documentation index",
    "DOCUMENTATION-SUMMARY": "Documentation summary",
};

const DOCUMENTATION_TITLE = "Documentation - Nest by Eden Oasis";

function titleForPath(pathname: string): string | null {
    if (pathname === "/documentation" || pathname.startsWith("/documentation/")) {
        return DOCUMENTATION_TITLE;
    }

    const exact = ROUTE_TITLES[pathname];
    if (exact) return `${exact} | Nest`;

    if (pathname.startsWith("/docs/")) {
        const slug = pathname.slice("/docs/".length).split("/")[0] ?? "";
        const docTitle = DOC_TITLES[slug] ?? "Documentation";
        return `${docTitle} | Nest`;
    }

    return null;
}

export function DocumentTitle() {
    const pathname = usePathname();

    useEffect(() => {
        const title = titleForPath(pathname);
        if (!title) return;

        const apply = () => {
            if (document.title !== title) document.title = title;
        };
        apply();
        const interval = window.setInterval(apply, 200);
        const stop = window.setTimeout(() => window.clearInterval(interval), 3000);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(stop);
        };
    }, [pathname]);

    return null;
}
