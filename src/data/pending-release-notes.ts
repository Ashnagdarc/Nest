import type { ReleaseNotesDraft } from "@/lib/release-notes/types";

/**
 * Edit this draft before each blast, or update it in Admin → Release notes.
 * Add new bullets under the right section whenever you ship fixes or improvements.
 */
export const PENDING_RELEASE_NOTES: ReleaseNotesDraft = {
    version: "2026.07.10",
    title: "Nest platform update — July 2026",
    intro:
        "We've shipped a major round of improvements across the user app, admin tools, database, and notifications. Here's what's new and how to get the most out of Nest on your phone.",
    sections: [
        {
            title: "User app — what's improved",
            items: [
                "Dashboard refreshed with clearer quick actions, notifications, and recent activity.",
                "Check-in flow rebuilt — easier step-by-step gear returns with booking context and history.",
                "Browse, request, my requests, and car booking pages are more reliable and responsive.",
                "Profile settings improved — update your name, photo, password, and notification preferences in one place.",
                "Announcements and in-app notifications are easier to find from the dashboard and nav.",
                "Live bus tracking and activity history continue to work from the user portal.",
            ],
        },
        {
            title: "Admin tools — what's improved",
            items: [
                "Reports & Analytics rebuilt with accurate data, better charts, and improved Excel/CSV exports.",
                "Admin Settings simplified into a clean tabbed layout (profile, security, notifications, app rules).",
                "Admin sidebar redesigned with grouped navigation (Equipment, Fleet, People, Insights, System).",
                "Admin dashboard shows pending gear requests, check-ins, and car bookings in Needs attention.",
                "Recent Activity uses readable dates, grouped by day, with scrollable cards.",
                "Database tools under Settings → Database for check-in integrity checks and repairs.",
            ],
        },
        {
            title: "Database & reliability",
            items: [
                "Missing user profiles are backfilled automatically when accounts are created.",
                "Profile avatars storage secured — users upload to their own folder only.",
                "Gear request sync and idempotency fixes reduce duplicate or stuck requests.",
                "Check-in data integrity tools fixed — orphaned check-ins are detected correctly.",
                "Push notification queue hardened for reliable delivery and retries.",
                "API route security hardened — debug and test endpoints removed from production.",
                "Booking lifecycle and car status sync improvements for more consistent fleet data.",
            ],
        },
        {
            title: "Push notifications — now working",
            items: [
                "Push notifications are live for gear approvals, check-ins, car bookings, announcements, and security alerts.",
                "Enable push in Nest → Settings → Notifications → tap Enable push, then allow browser permission.",
                "Use Send test on that same screen to confirm your device is registered.",
                "Choose which events you want via push, email, or in-app for each notification type.",
            ],
        },
        {
            title: "Install Nest on Android",
            items: [
                "Open Nest in Google Chrome (recommended).",
                "Tap the menu (⋮) → Install app or Add to Home screen.",
                "Open Nest from your home screen — it runs like a native app.",
                "Sign in, go to Settings → Notifications, tap Enable push, and allow notifications when prompted.",
            ],
        },
        {
            title: "Install Nest on iPhone / iPad",
            items: [
                "Open Nest in Safari (required for install on iOS — Chrome will not offer Add to Home Screen).",
                "Tap the Share button → Add to Home Screen → Add.",
                "Open Nest from your home screen icon.",
                "Sign in, go to Settings → Notifications, tap Enable push, and tap Allow when iOS asks.",
                "If push does not appear, check iOS Settings → Notifications → Nest and ensure alerts are enabled.",
            ],
        },
        {
            title: "Fixes",
            items: [
                "Admins no longer get stuck on the user portal — role routing keeps you on the correct dashboard.",
                "Reports export no longer crashes; empty cells show as dashes instead of misleading zeros.",
                "Car booking dates display in plain language (e.g. Jul 10, 2026) instead of raw database formats.",
                "Console and runtime errors reduced across admin settings, docs, and API routes.",
            ],
        },
    ],
};
