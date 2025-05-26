"use client";

import React, { useState, useEffect } from 'react';
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
import CustomHamburger from '@/components/CustomHamburger';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Package, ListChecks, UserCog, Upload, BarChart2, Settings, Bell, LogOut, PanelLeft, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useUserProfile } from '@/components/providers/user-profile-provider';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/manage-gears', label: 'Manage Gears', icon: Package },
  { href: '/admin/manage-requests', label: 'Manage Requests', icon: ListChecks },
  { href: '/admin/manage-checkins', label: 'Manage Check-ins', icon: Upload },
  { href: '/admin/manage-users', label: 'Manage Users', icon: UserCog },
  { href: '/admin/calendar', label: 'Book Calendar', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart2 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell }, // Assuming notifications exist
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

type Profile = any;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { profile: adminUser, isLoading: isLoadingUser, refreshProfile } = useUserProfile();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const { toast } = useToast();

  // Improved toggle function for hamburger and sidebar sync
  const toggleSidebar = () => {
    setIsHamburgerOpen(!isHamburgerOpen);
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    }
  };

  const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <div className="md:hidden">
                <SidebarTrigger>
                  <CustomHamburger
                    size={20}
                    direction="right"
                    toggled={isHamburgerOpen}
                    toggle={toggleSidebar}
                  />
                </SidebarTrigger>
              </div>
              <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary truncate group-data-[collapsible=icon]:hidden">
                <span className="truncate">GearFlow Admin</span>
              </Link>
            </div>
            <div className="group-data-[state=collapsed]:hidden">
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
                      <item.icon className="h-5 w-5 flex-shrink-0" />
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
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-primary truncate max-w-[70%]">
            <span className="truncate">GearFlow Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SidebarTrigger>
              <CustomHamburger
                size={20}
                direction="right"
                toggled={isHamburgerOpen}
                toggle={toggleSidebar}
              />
            </SidebarTrigger>
          </div>
        </div>
        <div className="p-4 md:p-6 lg:p-8 flex-1 overflow-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="max-w-full"
          >
            {/* Render children only if user loading is complete and user is verified admin */}
            {!isLoadingUser && adminUser ? (
              <div className="container mx-auto px-4 w-full">
                {children}
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                {/* Optional: Show a loading spinner or unauthorized message */}
                {isLoadingUser ? <p>Loading admin data...</p> : <p>Access denied.</p>}
              </div>
            )}
          </motion.div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
