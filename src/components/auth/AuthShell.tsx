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
                <Link href="/" aria-label="Nest" className="inline-flex items-center rounded-md">
                    <span className="relative block h-8 w-[5.5rem] overflow-hidden">
                        <ThemeLogo
                            width={106}
                            height={106}
                            alt=""
                            priority
                            className="pointer-events-none absolute left-1/2 top-1/2 h-[6.625rem] w-[6.625rem] max-w-none -translate-x-1/2 -translate-y-1/2"
                        />
                    </span>
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
