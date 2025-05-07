"use client";

import { Button } from "@/components/ui/button";
import TestSupabase from "@/components/test-supabase";
import Link from "next/link";

export default function TestConnectionPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Database Connection Test</h1>
                <Button variant="outline" asChild>
                    <Link href="/">Return Home</Link>
                </Button>
            </div>
            <div className="bg-card rounded-lg border shadow-sm">
                <TestSupabase />
            </div>
        </div>
    );
} 