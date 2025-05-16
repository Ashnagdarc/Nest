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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, Search, PlusSquare, ListChecks, UploadCloud, History, Bell, Settings, LogOut, PanelLeft, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { useIsMobile } from '@/hooks/use-mobile';
import CustomHamburger from '@/components/CustomHamburger';

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

// Use any for Profile type if the database types aren't set up properly
type Profile = any;

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const isMobile = useIsMobile();
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Toggle function for hamburger and sidebar sync
  const toggleSidebar = () => {
    setIsHamburgerOpen(!isHamburgerOpen);
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          router.push('/login');
          return;
        }

        // Fetch the user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profile) {
          console.error('No profile found for user');
          router.push('/login');
          return;
        }

        setCurrentUser(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        router.push('/login');
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserProfile();
  }, [router, supabase]);

  const handleLogout = async () => {
    setIsLoadingUser(true); // Show loading state during logout
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        // Handle logout error if needed
      } else {
        setCurrentUser(null); // Clear user state
        router.push('/login'); // Redirect after successful logout
      }
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    } finally {
      setIsLoadingUser(false); // Hide loading state
    }
  };

  const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

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
              {/* Hamburger for mobile */}
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
              <Link href="/user/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary truncate group-data-[collapsible=icon]:hidden">
                <span className="truncate">GearFlow User</span>
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
              {userNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/user/dashboard')}
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
        {/* Header for mobile view with hamburger trigger */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Link href="/user/dashboard" className="flex items-center gap-2 font-semibold text-primary truncate max-w-[70%]">
            <span className="truncate">GearFlow User</span>
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
            {/* Render children only if user loading is complete and user exists */}
            {!isLoadingUser && currentUser ? children : (
              <div className="flex justify-center items-center h-64">
                {/* Optional: Show loading spinner */}
                {isLoadingUser ? <p>Loading user data...</p> : <p>Access denied.</p>}
              </div>
            )}
          </motion.div>
        </div>
      </SidebarInset>
      <AnnouncementPopup />
    </SidebarProvider>
  );
}
