"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Database, RefreshCw, Play, FileCode } from 'lucide-react';
import { verifyDatabaseSetup, REQUIRED_TABLES } from '@/lib/utils/database-setup';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function DatabaseSetupPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isRunningMigration, setIsRunningMigration] = useState(false);
    const [dbStatus, setDbStatus] = useState<{
        isComplete: boolean;
        missingTables: string[];
        error?: any;
    }>({
        isComplete: false,
        missingTables: []
    });

    // Fetch database status on load
    useEffect(() => {
        checkDatabaseStatus();
    }, []);

    // Check database setup status
    async function checkDatabaseStatus() {
        setIsLoading(true);
        try {
            const status = await verifyDatabaseSetup();
            setDbStatus(status);
        } catch (error) {
            console.error('Error checking database status:', error);
            toast({
                title: 'Error',
                description: 'Failed to check database status',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Run migrations
    async function runMigrations() {
        setIsRunningMigration(true);
        try {
            const supabase = createClient();

            // Run SQL from migration files
            const { data, error } = await supabase.rpc('execute_sql', {
                sql_string: `
          -- Check if gear_maintenance table exists
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = 'gear_maintenance'
            ) THEN
              -- Create the gear_maintenance table
              CREATE TABLE public.gear_maintenance (
                id SERIAL PRIMARY KEY,
                gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
                status TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'Maintenance', -- 'Maintenance', 'Damage Report', etc.
                issue_description TEXT,
                resolution TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                user_id UUID REFERENCES auth.users(id),
                completed_at TIMESTAMP WITH TIME ZONE
              );
              
              -- Add comment to table
              COMMENT ON TABLE public.gear_maintenance IS 'Records maintenance and damage reports for equipment';
              
              -- Enable RLS
              ALTER TABLE public.gear_maintenance ENABLE ROW LEVEL SECURITY;
              
              -- Create policies
              CREATE POLICY "Admins can do anything" ON public.gear_maintenance
                FOR ALL TO authenticated
                USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
                WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
              
              CREATE POLICY "Users can view maintenance records" ON public.gear_maintenance
                FOR SELECT TO authenticated
                USING (true);
              
              CREATE POLICY "Users can create damage reports" ON public.gear_maintenance
                FOR INSERT TO authenticated
                WITH CHECK (type = 'Damage Report');
            END IF;
          END $$;
        `
            });

            if (error) {
                throw error;
            }

            toast({
                title: 'Success',
                description: 'Database migrations completed successfully',
                variant: 'default',
            });

            // Refresh database status
            await checkDatabaseStatus();
        } catch (error) {
            console.error('Error running migrations:', error);
            toast({
                title: 'Migration Failed',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsRunningMigration(false);
        }
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                <Database className="h-8 w-8" /> Database Setup
            </h1>

            <Card className="mb-8">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Database Status</CardTitle>
                            <CardDescription>
                                Check if all required tables are set up properly
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={checkDatabaseStatus}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : dbStatus.error ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                Failed to check database status: {dbStatus.error.message || 'Unknown error'}
                            </AlertDescription>
                        </Alert>
                    ) : dbStatus.isComplete ? (
                        <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-800 dark:text-green-400">All Set!</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                All required database tables are set up properly.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Missing Tables</AlertTitle>
                                <AlertDescription>
                                    Some required database tables are missing. Run the migrations to set them up.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {REQUIRED_TABLES.map(table => (
                                    <div key={table} className="flex items-center gap-2 p-2 rounded-md border">
                                        {dbStatus.missingTables.includes(table) ? (
                                            <AlertCircle className="h-4 w-4 text-destructive" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        )}
                                        <span>{table}</span>
                                        <Badge variant={dbStatus.missingTables.includes(table) ? 'destructive' : 'outline'} className="ml-auto">
                                            {dbStatus.missingTables.includes(table) ? 'Missing' : 'Ready'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button
                        variant="default"
                        onClick={runMigrations}
                        disabled={isRunningMigration || dbStatus.isComplete}
                        className="gap-2"
                    >
                        {isRunningMigration ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Running Migrations...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4" />
                                Run Migrations
                            </>
                        )}
                    </Button>

                    <Button variant="outline" className="gap-2">
                        <FileCode className="h-4 w-4" />
                        View Migration Files
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Database Management</CardTitle>
                    <CardDescription>
                        Advanced database operations for administrators
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        These operations should only be performed by database administrators who understand
                        the consequences. Improper use can result in data loss.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center">
                            <Database className="h-6 w-6 mb-2" />
                            <span className="font-medium">Verify Data Integrity</span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Check for orphaned records and data consistency
                            </span>
                        </Button>

                        <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center">
                            <Database className="h-6 w-6 mb-2" />
                            <span className="font-medium">Optimize Database</span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Run VACUUM and analyze tables for performance
                            </span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 