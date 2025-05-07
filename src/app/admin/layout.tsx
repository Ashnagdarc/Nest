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
import { Home, Package, ListChecks, UserCog, Upload, BarChart2, Settings, Bell, LogOut, PanelLeft, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

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
  const supabase = createClient(); // Create Supabase client instance
  const [adminUser, setAdminUser] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchAdminData = async (userId: string) => {
      setIsLoadingUser(true);
      console.log("AdminLayout: Fetching profile for user ID:", userId);
      // Fetch profile data from Supabase 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(); // Expect exactly one profile

      if (profileError) {
        console.error("AdminLayout: Error fetching admin profile:", profileError.message);
        // Handle error - Log out and redirect
        await supabase.auth.signOut();
        router.push('/login?error=fetcherror');
        setIsLoadingUser(false);
        return;
      }

      if (!profile) {
        console.error("AdminLayout: Admin profile not found for UID:", userId);
        await supabase.auth.signOut();
        router.push('/login?error=noprofile');
        setIsLoadingUser(false);
        return;
      }

      // Verify if the user has Admin role
      if (profile.role !== 'Admin') {
        console.warn("AdminLayout: User is not an Admin. Redirecting.");
        // Redirect non-admin users away
        await supabase.auth.signOut(); // Log them out
        router.push('/login?error=unauthorized'); // Redirect to login
        setIsLoadingUser(false);
        return;
      }

      console.log("AdminLayout: Admin profile loaded:", profile);
      setAdminUser(profile);
      setIsLoadingUser(false);
    };

    // Listen for Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("AdminLayout: Auth state change - SIGNED_IN");
        fetchAdminData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log("AdminLayout: Auth state change - SIGNED_OUT");
        setAdminUser(null);
        setIsLoadingUser(false);
        router.push('/login');
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        console.log("AdminLayout: Auth state change - INITIAL_SESSION");
        fetchAdminData(session.user.id);
      } else if (event === 'INITIAL_SESSION' && !session?.user) {
        console.log("AdminLayout: Auth state change - INITIAL_SESSION (no user), redirecting");
        setIsLoadingUser(false);
        router.push('/login');
      }
      // Handle other events like PASSWORD_RECOVERY, USER_UPDATED if needed
    });

    // Initial check in case the listener doesn't fire immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !adminUser) { // Fetch only if user exists and not already loaded
        console.log("AdminLayout: Initial session check found user, fetching data.");
        fetchAdminData(session.user.id);
      } else if (!session?.user) {
        console.log("AdminLayout: Initial session check found no user.");
        setIsLoadingUser(false); // Ensure loading stops if no initial session
        // Redirect might happen via listener, or could be added here too
      }
    });


    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Dependency on router and supabase client (though client is stable)

  const handleLogout = async () => {
    setIsLoadingUser(true); // Show loading state during logout
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        // Handle logout error if needed (e.g., show toast)
      } else {
        setAdminUser(null); // Clear user state
        router.push('/login'); // Redirect after successful logout
      }
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    } finally {
      setIsLoadingUser(false); // Hide loading state
    }
  };

  const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="items-center justify-center p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Hamburger icon for mobile */}
              <SidebarTrigger className="md:hidden mr-2" />
              <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
                <span>GearFlow Admin</span>
              </Link>
            </div>
            <ThemeToggle />
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
          ) : adminUser ? (
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-10 w-10">
                {/* Use adminUser.avatar_url from Supabase profile */}
                <AvatarImage src={adminUser.avatar_url || `https://picsum.photos/seed/${adminUser.email}/100/100`} alt={adminUser.full_name || 'Admin'} data-ai-hint="admin avatar" />
                <AvatarFallback>{getInitials(adminUser.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm truncate">
                {/* Use adminUser.full_name and adminUser.email from Supabase profile */}
                <span className="font-semibold text-foreground">{adminUser.full_name || 'Admin User'}</span>
                <span className="text-xs text-muted-foreground">{adminUser.email || 'admin@example.com'}</span>
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
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-primary">
            <span>GearFlow Admin</span>
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
            {/* Render children only if user loading is complete and user is verified admin */}
            {!isLoadingUser && adminUser ? children : (
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
