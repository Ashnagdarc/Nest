"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface SupabaseErrorProps {
    error?: string;
    isAdmin?: boolean;
}

export default function SupabaseError({ error, isAdmin }: SupabaseErrorProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-lg w-full">
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                        <CardTitle>Database Connection Error</CardTitle>
                    </div>
                    <CardDescription>
                        There was an issue connecting to the database service.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isAdmin ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Admin Notice: Please check the following:
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                                    <li>Verify that <code>.env.local</code> exists in the project root</li>
                                    <li>Confirm <code>NEXT_PUBLIC_SUPABASE_URL</code> is set correctly</li>
                                    <li>Confirm <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> is set correctly</li>
                                    <li>Check if <code>SUPABASE_SERVICE_ROLE_KEY</code> is required and set</li>
                                </ul>
                                {error && (
                                    <div className="mt-4 p-4 bg-destructive/10 rounded-md">
                                        <p className="text-sm font-mono text-destructive">{error}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                The application is currently experiencing technical difficulties.
                                Our team has been notified and is working to resolve the issue.
                            </p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" asChild>
                        <Link href="/">Return Home</Link>
                    </Button>
                    {isAdmin && (
                        <Button variant="default" asChild>
                            <Link href="/test-connection">Test Connection</Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
} 