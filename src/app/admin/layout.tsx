"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Package, ListChecks, UserCog, Upload, BarChart2, Settings, Bell, LogOut, PanelLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/components/providers/user-profile-provider';
import { DashboardHeader } from '@/components/DashboardHeader';
import EnhancedNavbar from '@/components/navigation/enhanced-navbar';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/manage-gears', label: 'Manage Gears', icon: Package },
  { href: '/admin/manage-requests', label: 'Manage Requests', icon: ListChecks },
  { href: '/admin/manage-checkins', label: 'Manage Check-ins', icon: Upload },
  { href: '/admin/manage-car-bookings', label: 'Manage Car Bookings', icon: ListChecks },
  { href: '/admin/manage-users', label: 'Manage Users', icon: UserCog },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart2 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { profile: adminUser, isLoading: isLoadingUser } = useUserProfile();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    }
  };

  const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';

  // Show enhanced navbar on mobile, sidebar on desktop
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedNavbar variant="admin" />
        <div className="pt-16 sm:pt-18">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop sidebar layout
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary truncate group-data-[collapsible=icon]:hidden">
                <span className="truncate">Nest Admin</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 group-data-[state=collapsed]:hidden">
              <ThemeToggle />
            </div>
          </div>
        </SidebarHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <SidebarContent className="p-2">
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin/dashboard')}
                    tooltip={item.label}
                    asChild
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      {React.createElement(item.icon, { className: "h-5 w-5 flex-shrink-0" })}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </ScrollArea>
        <Separator />
        <SidebarFooter className="p-4 space-y-2">
          {isLoadingUser ? (
            <div className="flex items-center gap-3 mb-2 animate-pulse">
              <Avatar className="h-10 w-10 bg-muted rounded-full"></Avatar>
              <div className="space-y-1 group-data-[state=collapsed]:hidden">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </div>
          ) : adminUser ? (
            <div className="flex items-center gap-3 mb-2 group-data-[state=collapsed]:justify-center">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={adminUser.avatar_url || `https://picsum.photos/seed/${adminUser.email}/100/100`} alt={adminUser.full_name || 'Admin'} data-ai-hint="admin avatar" />
                <AvatarFallback>{getInitials(adminUser.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm max-w-[calc(100%-52px)] group-data-[state=collapsed]:hidden">
                <span className="font-semibold text-foreground truncate">{adminUser.full_name || 'Admin User'}</span>
                <span className="text-xs text-muted-foreground truncate">{adminUser.email || 'admin@example.com'}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-destructive">Error loading user</div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full group-data-[state=collapsed]:p-2 group-data-[state=collapsed]:justify-center group-data-[state=expanded]:justify-start"
            onClick={handleLogout}
            disabled={isLoadingUser}
          >
            <LogOut className="h-4 w-4 flex-shrink-0 group-data-[state=expanded]:mr-2" />
            <span className="truncate group-data-[state=collapsed]:hidden">
              {isLoadingUser ? 'Logging out...' : 'Logout'}
            </span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader userType="admin" />
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 flex-1 overflow-auto">
          <div className="max-w-full">
            {/* Render children only if user loading is complete and user is verified admin */}
            {!isLoadingUser && adminUser ? (
              <div className="container mx-auto px-2 sm:px-4 w-full">
                {children}
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                {/* Optional: Show a loading spinner or unauthorized message */}
                {isLoadingUser ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-sm sm:text-base text-muted-foreground">Loading admin data...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 text-destructive">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base text-destructive">Access denied.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
