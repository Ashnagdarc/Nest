"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import EnhancedNavbar from "@/components/navigation/enhanced-navbar";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const FULL_WIDTH_ADMIN_ROUTES = ["/admin/release-notes"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const { profile: adminUser, isLoading: isLoadingUser } = useUserProfile();
    const pathname = usePathname();
    const useFullWidth = FULL_WIDTH_ADMIN_ROUTES.some((route) => pathname?.startsWith(route));

    if (isMobile) {
        return (
            <div className="min-h-screen bg-background">
                <EnhancedNavbar variant="admin" />
                <div className="pt-16 sm:pt-18">
                    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                        {children}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen>
            <AdminSidebar />
            <SidebarInset>
                <DashboardHeader userType="admin" />
                <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                    {!isLoadingUser && adminUser ? (
                        <div
                            className={cn(
                                "mx-auto w-full",
                                useFullWidth ? "max-w-none" : "max-w-7xl",
                            )}
                        >
                            {children}
                        </div>
                    ) : (
                        <div className="flex h-64 items-center justify-center">
                            {isLoadingUser ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <p className="text-sm text-muted-foreground">Loading admin data…</p>
                                </div>
                            ) : (
                                <p className="text-sm text-destructive">Access denied.</p>
                            )}
                        </div>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
