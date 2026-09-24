"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import EnhancedNavbar from "@/components/navigation/enhanced-navbar";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SkipLink } from "@/components/SkipLink";

const FULL_WIDTH_ADMIN_ROUTES = ["/admin/release-notes"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { profile: adminUser, isLoading: isLoadingUser } = useUserProfile();
    const pathname = usePathname();
    const useFullWidth = FULL_WIDTH_ADMIN_ROUTES.some((route) => pathname?.startsWith(route));

    return (
        <>
            <SkipLink />
            <div className="md:hidden">
                <EnhancedNavbar variant="admin" />
            </div>
            <SidebarProvider defaultOpen>
                <AdminSidebar />
                <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 overflow-x-hidden outline-none">
                    <div className="hidden md:block">
                        <DashboardHeader userType="admin" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-x-hidden pt-16 md:pt-0">
                        <div className="p-4 md:p-6 lg:p-8">
                            {!isLoadingUser && adminUser ? (
                                <div
                                    className={cn(
                                        "mx-auto w-full min-w-0",
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
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
