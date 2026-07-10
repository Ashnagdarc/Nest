"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeLogo } from "@/components/ui/theme-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { isUserNavActive, userNavGroups } from "@/components/navigation/user-nav-config";
import { cn } from "@/lib/utils";

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

export function UserSidebar() {
    const pathname = usePathname();
    const { profile: currentUser, isLoading: isLoadingUser } = useUserProfile();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border p-3">
                <div className="flex items-center justify-between gap-2">
                    <Link
                        href="/user/dashboard"
                        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-lg p-1 transition-colors hover:bg-sidebar-accent"
                    >
                        <ThemeLogo width={32} height={32} className="h-8 w-8 shrink-0" />
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-semibold text-foreground">Nest</p>
                            <p className="truncate text-xs text-muted-foreground">User portal</p>
                        </div>
                    </Link>
                    <ThemeToggle />
                </div>
            </SidebarHeader>

            <SidebarContent>
                {userNavGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isUserNavActive(pathname, item.href);

                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                tooltip={item.label}
                                                asChild
                                            >
                                                <Link href={item.href}>
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter className="p-3">
                {isLoadingUser ? (
                    <div className="flex items-center gap-3 rounded-lg border border-sidebar-border p-2 animate-pulse group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
                        <div className="min-w-0 flex-1 space-y-1.5 group-data-[collapsible=icon]:hidden">
                            <div className="h-3.5 w-24 rounded bg-muted" />
                            <div className="h-3 w-32 rounded bg-muted" />
                        </div>
                    </div>
                ) : currentUser ? (
                    <Link
                        href="/user/settings"
                        className={cn(
                            "flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-2 transition-colors hover:bg-sidebar-accent",
                            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
                        )}
                    >
                        <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage
                                src={currentUser.avatar_url ?? undefined}
                                alt={currentUser.full_name || "User"}
                            />
                            <AvatarFallback className="text-xs">
                                {getInitials(currentUser.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <p className="truncate text-sm font-medium text-foreground">
                                {currentUser.full_name || "User"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {currentUser.email || ""}
                            </p>
                        </div>
                    </Link>
                ) : (
                    <p className="px-2 text-xs text-destructive group-data-[collapsible=icon]:hidden">
                        Unable to load profile
                    </p>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}
