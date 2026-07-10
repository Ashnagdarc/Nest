"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft, BusFront, Package, ShieldCheck } from "lucide-react";
import { ThemeLogo } from "@/components/ui/theme-logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface AuthShellProps {
    children: ReactNode;
    backHref?: string;
    backLabel?: string;
}

const highlights = [
    { icon: Package, text: "Request and track production gear" },
    { icon: BusFront, text: "Book cars and follow live bus routes" },
    { icon: ShieldCheck, text: "Secure access for Eden Oasis teams" },
];

export function AuthShell({
    children,
    backHref = "/",
    backLabel = "Back to Home",
}: AuthShellProps) {
    return (
        <div className="flex min-h-screen">
            <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:w-[42%] xl:w-[38%]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
                <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
                    <div className="flex items-center gap-3">
                        <ThemeLogo width={40} height={40} className="h-10 w-10 rounded-lg bg-white/10 p-1" />
                        <div>
                            <p className="text-lg font-semibold">Nest</p>
                            <p className="text-sm text-primary-foreground/80">by Eden Oasis</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight xl:text-4xl">
                                Your production hub
                            </h1>
                            <p className="max-w-md text-sm leading-relaxed text-primary-foreground/85 xl:text-base">
                                Manage equipment, bookings, and team updates in one place.
                            </p>
                        </div>
                        <ul className="space-y-3">
                            {highlights.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xs text-primary-foreground/70">
                        © {new Date().getFullYear()} Eden Oasis. Internal use only.
                    </p>
                </div>
            </aside>

            <main className="flex flex-1 flex-col">
                <div className="flex items-center justify-between px-4 py-4 sm:px-8">
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {backLabel}
                    </Link>
                    <ThemeToggle />
                </div>

                <div className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-8">
                    <div className="w-full max-w-md">{children}</div>
                </div>
            </main>
        </div>
    );
}
