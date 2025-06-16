import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/components/providers/user-profile-provider';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DashboardHeader() {
    const { profile: currentUser, isLoading: isLoadingUser } = useUserProfile();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

    return (
        <header className="sticky top-0 z-30 w-full bg-background/95 border-b flex items-center justify-between px-4 py-2 shadow-sm">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                <img src="/favicon.png" alt="Logo" className="h-7 w-7" />
                <span className="hidden sm:inline">Flow Tag</span>
            </Link>
            <div className="flex items-center gap-3">
                <NotificationBell />
                {isLoadingUser ? (
                    <Avatar className="h-9 w-9 bg-muted rounded-full animate-pulse" />
                ) : currentUser ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={currentUser.avatar_url || `https://picsum.photos/seed/${currentUser.email}/100/100`} alt={currentUser.full_name || 'User'} />
                            <AvatarFallback>{getInitials(currentUser.full_name)}</AvatarFallback>
                        </Avatar>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs px-2">
                            Logout
                        </Button>
                    </div>
                ) : (
                    <span className="text-xs text-destructive">Error</span>
                )}
            </div>
        </header>
    );
} 