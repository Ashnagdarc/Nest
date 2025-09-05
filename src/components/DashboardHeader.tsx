"use client";

import { Button } from "@/components/ui/button";
import { ThemeLogo } from "@/components/ui/theme-logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { NotificationBell } from "@/components/NotificationBell";

interface DashboardHeaderProps {
    userType?: 'admin' | 'user';
}

export function DashboardHeader({ userType = 'user' }: DashboardHeaderProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();
    const { profile: currentUser } = useUserProfile();

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name: string | null = "") =>
        name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";

    return (
        <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center space-x-3">
                <ThemeLogo width={56} height={56} className="h-14 w-14 lg:h-16 lg:w-16" />
            </div>
            <div className="flex items-center gap-3">
                <NotificationBell userType={userType} />
                <Avatar className="h-8 w-8">
                    <AvatarImage
                        src={currentUser?.avatar_url || (currentUser?.email ? `https://picsum.photos/seed/${currentUser.email}/100/100` : undefined)}
                        alt={currentUser?.full_name || "User"}
                    />
                    <AvatarFallback className="text-xs">
                        {getInitials(currentUser?.full_name)}
                    </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs px-2">
                    Logout
                </Button>
            </div>
        </header>
    );
} 