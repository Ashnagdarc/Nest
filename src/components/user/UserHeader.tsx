"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";

export function UserHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 flex">
                    <Link href="/user" className="mr-6 flex items-center space-x-2">
                        <span className="font-bold">Gear Management</span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href="/user/dashboard"
                            className="transition-colors hover:text-foreground/80"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/user/browse"
                            className="transition-colors hover:text-foreground/80"
                        >
                            Browse Gears
                        </Link>
                        <Link
                            href="/user/checkout"
                            className="transition-colors hover:text-foreground/80"
                        >
                            Checkout History
                        </Link>
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <NotificationBell />
                    <ThemeToggle />
                    <UserNav />
                </div>
            </div>
        </header>
    );
} 