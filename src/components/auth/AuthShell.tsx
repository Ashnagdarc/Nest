"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ThemeLogo } from "@/components/ui/theme-logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface AuthShellProps {
    children: ReactNode;
    backHref?: string;
    backLabel?: string;
}

export function AuthShell({ children, backHref, backLabel }: AuthShellProps) {
    return (
        <div className="dark flex min-h-screen flex-col bg-background text-foreground [color-scheme:dark]">
            <header className="flex items-center justify-between px-4 py-4">
                <Link href="/" className="inline-flex items-center gap-2.5 rounded-md">
                    <ThemeLogo width={32} height={32} className="h-8 w-8" priority />
                    <span className="text-sm font-semibold tracking-tight">Nest</span>
                </Link>
                <div className="flex items-center gap-1">
                    {backHref && backLabel ? (
                        <Link
                            href={backHref}
                            className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            {backLabel}
                        </Link>
                    ) : null}
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex flex-1 flex-col px-4 pb-10">
                <div className="mx-auto my-auto w-full max-w-[400px] py-4 [&_input]:border-neutral-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
