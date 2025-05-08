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
import { createClient } from '@/lib/supabase/client'; // Import Supabase client
import ThemeToggle from '@/components/ThemeToggle';
import { AnnouncementPopup } from "@/components/AnnouncementPopup";

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

type Profile = any;

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient(); // Create Supabase client instance
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUserData = async (userId: string) => {
      setIsLoadingUser(true);
      console.log("UserLayout: Fetching profile for user ID:", userId);
      // Fetch profile data from Supabase 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*') // Adjust columns as needed
        .eq('id', userId)
        .single(); // Expect one profile

      if (profileError) {
        console.error("UserLayout: Error fetching user profile:", profileError.message);
        // Handle error - Log out and redirect if profile essential
        await supabase.auth.signOut();
        router.push('/login?error=fetcherror');
        setIsLoadingUser(false);
        return;
      }

      if (!profile) {
        console.error("UserLayout: User profile not found for UID:", userId);
        await supabase.auth.signOut();
        router.push('/login?error=noprofile');
        setIsLoadingUser(false);
        return;
      }
      console.log("UserLayout: User profile loaded:", profile);
      setCurrentUser(profile);
      setIsLoadingUser(false);
    };

    // Listen for Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("UserLayout: Auth state change - SIGNED_IN");
        fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log("UserLayout: Auth state change - SIGNED_OUT");
        setCurrentUser(null);
        setIsLoadingUser(false);
        router.push('/login');
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        console.log("UserLayout: Auth state change - INITIAL_SESSION");
        fetchUserData(session.user.id);
      } else if (event === 'INITIAL_SESSION' && !session?.user) {
        console.log("UserLayout: Auth state change - INITIAL_SESSION (no user), redirecting");
        setIsLoadingUser(false);
        router.push('/login');
      }
      // Handle other events like USER_UPDATED if profile needs refresh
      if (event === 'USER_UPDATED' && session?.user) {
        console.log("UserLayout: Auth state change - USER_UPDATED, refetching profile");
        fetchUserData(session.user.id);
      }
    });

    // Initial check in case the listener doesn't fire immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log("UserLayout: Initial session check found user, fetching data.");
        fetchUserData(session.user.id);
      } else {
        console.log("UserLayout: Initial session check found no user.");
        setIsLoadingUser(false);
      }
    });


    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Dependency on router

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
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="items-center justify-center p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Hamburger icon for mobile */}
              <SidebarTrigger className="md:hidden mr-2" />
              <Link href="/user/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
                <span>GearFlow User</span>
              </Link>
            </div>
            <ThemeToggle />
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
                      <item.icon />
                      <span>{item.label}</span>
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
              <div className="space-y-1">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-10 w-10">
                {/* Use currentUser.avatar_url from Supabase profile */}
                <AvatarImage src={currentUser.avatar_url || `https://picsum.photos/seed/${currentUser.email}/100/100`} alt={currentUser.full_name || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(currentUser.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm truncate">
                {/* Use currentUser.full_name and currentUser.email from Supabase profile */}
                <span className="font-semibold text-foreground">{currentUser.full_name || 'User'}</span>
                <span className="text-xs text-muted-foreground">{currentUser.email || 'user@example.com'}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-destructive">Error loading user</div>
          )}
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleLogout} disabled={isLoadingUser}>
            <LogOut className="mr-2 h-4 w-4" />
            {isLoadingUser ? 'Logging out...' : 'Logout'}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {/* Header for mobile view with hamburger trigger */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Link href="/user/dashboard" className="flex items-center gap-2 font-semibold text-primary">
            <span>GearFlow User</span>
          </Link>
          <SidebarTrigger className="ml-auto" />
        </div>
        <div className="p-4 md:p-6 lg:p-8 flex-1 overflow-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
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
