import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms of use",
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-12 text-foreground">
            <article className="mx-auto max-w-2xl space-y-6">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Eden Oasis · Internal use</p>
                    <h1 className="text-3xl font-bold tracking-tight">Terms of use</h1>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Nest is an internal tool for Eden Oasis staff. Creating an account means you agree to the
                        points below.
                    </p>
                </div>
                <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed">
                    <li>Use Nest only for Eden Oasis work, including gear requests, check-ins, and car bookings.</li>
                    <li>Give accurate names, dates, and reasons so equipment and vehicles can be tracked.</li>
                    <li>Return gear in the condition you received it, and report damage or loss to an admin.</li>
                    <li>Keep your password private. You are responsible for activity on your account.</li>
                    <li>Admins may approve, decline, or reassign requests, and may suspend access that is misused.</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                    Questions about access go to your Eden Oasis administrator.
                </p>
                <Link href="/signup" className="inline-flex text-sm font-medium text-primary underline underline-offset-4">
                    Back to create account
                </Link>
            </article>
        </main>
    );
}
