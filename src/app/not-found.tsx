import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
    title: "Page not found",
};

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">404</p>
                <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                    That address is not part of Nest. Head back to the home page to sign in or continue.
                </p>
            </div>
            <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
                Back to home
            </Link>
        </main>
    );
}
