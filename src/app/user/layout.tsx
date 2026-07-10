// User layout for Nest by Eden Oasis. Provides sidebar navigation and user context for user pages.

"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { DashboardHeader } from "@/components/DashboardHeader";
import EnhancedNavbar from "@/components/navigation/enhanced-navbar";
import { UserSidebar } from "@/components/navigation/UserSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function UserLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <div className="min-h-screen bg-background">
                <EnhancedNavbar variant="user" />
                <div className="pt-16 sm:pt-18">
                    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                        {children}
                    </div>
                </div>
                <AnnouncementPopup />
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen>
            <UserSidebar />
            <SidebarInset>
                <DashboardHeader userType="user" />
                <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-7xl">{children}</div>
                </div>
            </SidebarInset>
            <AnnouncementPopup />
        </SidebarProvider>
    );
}
