"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";

export default function TestSupabase() {
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        const testConnection = async () => {
            try {
                const supabase = createClient();

                // Test the connection by getting the current session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    throw error;
                }

                setConnectionStatus('success');
                toast({
                    title: "Supabase Connection Successful",
                    description: "Your app is successfully connected to Supabase!",
                    variant: "success",
                });

                console.log("Supabase connection test successful");
                if (session) {
                    console.log("Current session:", session);
                }
            } catch (error) {
                setConnectionStatus('error');
                const message = error instanceof Error ? error.message : 'Unknown error occurred';
                setErrorMessage(message);
                toast({
                    title: "Supabase Connection Failed",
                    description: message,
                    variant: "destructive",
                });
                console.error("Supabase connection test failed:", error);
            }
        };

        testConnection();
    }, [toast]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
            <div className="space-y-2">
                <p>Status:
                    <span className={`ml-2 font-semibold ${connectionStatus === 'success' ? 'text-green-500' :
                            connectionStatus === 'error' ? 'text-red-500' :
                                'text-yellow-500'
                        }`}>
                        {connectionStatus.toUpperCase()}
                    </span>
                </p>
                {errorMessage && (
                    <p className="text-red-500">Error: {errorMessage}</p>
                )}
            </div>
        </div>
    );
} 