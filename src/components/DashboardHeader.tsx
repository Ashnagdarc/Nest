"use client";

import { Button } from "@/components/ui/button";
import { ThemeLogo } from "@/components/ui/theme-logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardHeader() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

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

    return (
        <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center space-x-2">
                <ThemeLogo width={40} height={40} className="h-10 w-10" />
                <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs px-2">
                    Logout
                </Button>
            </div>
        </header>
    );
} 