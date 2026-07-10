"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { NotificationBell } from "@/components/NotificationBell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
    userType?: "admin" | "user";
}

function getInitials(name: string | null | undefined) {
    if (!name?.trim()) return "?";
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function DashboardHeader({ userType = "user" }: DashboardHeaderProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();
    const { profile: currentUser } = useUserProfile();

    const settingsPath = userType === "admin" ? "/admin/settings" : "/user/settings";
    const notificationsPath =
        userType === "admin" ? "/admin/notifications" : "/user/notifications";

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

    const displayName = currentUser?.full_name?.trim() || "User";
    const displayEmail = currentUser?.email ?? "";

    return (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-1 sm:gap-2">
                <NotificationBell userType={userType} userId={currentUser?.id} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-9 gap-2 px-2"
                            aria-label="Open account menu"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={currentUser?.avatar_url ?? undefined}
                                    alt={displayName}
                                />
                                <AvatarFallback className="text-xs">
                                    {getInitials(currentUser?.full_name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
                                {displayName}
                            </span>
                            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col gap-0.5">
                                <span className="truncate font-medium">{displayName}</span>
                                {displayEmail ? (
                                    <span className="truncate text-xs text-muted-foreground">
                                        {displayEmail}
                                    </span>
                                ) : null}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={settingsPath} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => router.push(notificationsPath)}
                        >
                            <Bell className="mr-2 h-4 w-4" />
                            Notifications
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            disabled={isLoading}
                            onSelect={(event) => {
                                event.preventDefault();
                                void handleLogout();
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            {isLoading ? "Logging out..." : "Logout"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
