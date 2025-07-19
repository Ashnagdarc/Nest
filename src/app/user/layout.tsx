// User layout for Nest by Eden Oasis. Provides sidebar navigation and user context for user pages.

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
import { LayoutDashboard, Search, PlusSquare, ListChecks, UploadCloud, History, Bell, Settings, LogOut, PanelLeft, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/components/providers/user-profile-provider';
import { DashboardHeader } from '@/components/DashboardHeader';
import EnhancedNavbar from '@/components/navigation/enhanced-navbar';

const userNavItems = [
  { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/browse', label: 'Browse Gears', icon: Search },
  { href: '/user/request', label: 'Request Gear', icon: PlusSquare },
  { href: '/user/my-requests', label: 'My Requests', icon: ListChecks },
  { href: '/user/check-in', label: 'Check-in Gear', icon: UploadCloud },
  { href: '/user/calendar', label: 'Book Calendar', icon: Calendar },
  { href: '/user/history', label: 'History', icon: History },
  { href: '/user/notifications', label: 'Notifications', icon: Bell },
  { href: '/user/settings', label: 'Settings', icon: Settings },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { profile: currentUser, isLoading: isLoadingUser } = useUserProfile();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    }
  };

  const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  // Show enhanced navbar on mobile, sidebar on desktop
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedNavbar variant="user" />
        <div className="pt-16 sm:pt-18">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {children}
          </div>
        </div>
        <AnnouncementPopup />
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
              {/* Sidebar trigger for desktop */}
              <SidebarTrigger className="hidden md:flex">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <Link href="/user/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary truncate group-data-[collapsible=icon]:hidden">
                <span className="truncate">Nest User</span>
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
              {userNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/user/dashboard')}
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
          ) : currentUser ? (
            <div className="flex items-center gap-3 mb-2 group-data-[state=collapsed]:justify-center">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={currentUser.avatar_url || `https://picsum.photos/seed/${currentUser.email}/100/100`} alt={currentUser.full_name || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(currentUser.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm max-w-[calc(100%-52px)] group-data-[state=collapsed]:hidden">
                <span className="font-semibold text-foreground truncate">{currentUser.full_name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{currentUser.email || 'user@example.com'}</span>
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
        <DashboardHeader />
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 flex-1 overflow-auto">
          <div className="max-w-full">
            <div className="container mx-auto px-2 sm:px-4 w-full">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
      <AnnouncementPopup />
    </SidebarProvider>
  );
}
