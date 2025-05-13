"use client";

import { Button } from "@/components/ui/button";
import TestSupabase from "@/components/test-supabase";
import Link from "next/link";

export default function TestConnectionPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
            <TestSupabase />
        </div>
    );
} 