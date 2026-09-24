// User layout for Nest by Eden Oasis. Provides sidebar navigation and user context for user pages.

"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { DashboardHeader } from "@/components/DashboardHeader";
import EnhancedNavbar from "@/components/navigation/enhanced-navbar";
import { UserSidebar } from "@/components/navigation/UserSidebar";
import { SkipLink } from "@/components/SkipLink";

export default function UserLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SkipLink />
            <div className="md:hidden">
                <EnhancedNavbar variant="user" />
            </div>
            <SidebarProvider defaultOpen>
                <UserSidebar />
                <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 overflow-x-hidden outline-none">
                    <div className="hidden md:block">
                        <DashboardHeader userType="user" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-x-hidden pt-16 md:pt-0">
                        <div className="mx-auto w-full min-w-0 max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
                    </div>
                </SidebarInset>
                <AnnouncementPopup />
            </SidebarProvider>
        </>
    );
}
