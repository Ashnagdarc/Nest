"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { fixCheckinDataInconsistencies, validateCheckinDataIntegrity, fixSpecificGearIssues } from '@/lib/utils/fix-checkin-data';
import { createClient } from '@/lib/supabase/client';

export default function DatabaseSettingsPage() {
    const { toast } = useToast();
    const supabase = createClient();
    const [isValidating, setIsValidating] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [isFixingSpecific, setIsFixingSpecific] = useState(false);
    const [isRunningMigration, setIsRunningMigration] = useState(false);
    const [isFixingRelationships, setIsFixingRelationships] = useState(false);
    const [isFixingDashboardCounts, setIsFixingDashboardCounts] = useState(false);
    const [validationResults, setValidationResults] = useState<string[]>([]);

    const handleValidateData = async () => {
        setIsValidating(true);
        setValidationResults([]);

        try {
            // Capture console.log output
            const originalLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => {
                logs.push(args.join(' '));
                originalLog(...args);
            };

            await validateCheckinDataIntegrity();

            console.log = originalLog;
            setValidationResults(logs);

            toast({
                title: "Validation Complete",
                description: "Data integrity validation has been completed. Check the results below.",
                variant: "default",
            });
        } catch (error) {
            console.error('Validation error:', error);
            toast({
                title: "Validation Error",
                description: "An error occurred during validation.",
                variant: "destructive",
            });
        } finally {
            setIsValidating(false);
        }
    };

    const handleFixData = async () => {
        setIsFixing(true);

        try {
            await fixCheckinDataInconsistencies();

            toast({
                title: "Data Fix Complete",
                description: "Check-in data inconsistencies have been fixed.",
                variant: "default",
            });

            // Re-validate after fixing
            await handleValidateData();
        } catch (error) {
            console.error('Fix error:', error);
            toast({
                title: "Fix Error",
                description: "An error occurred while fixing data inconsistencies.",
                variant: "destructive",
            });
        } finally {
            setIsFixing(false);
        }
    };

    const handleFixSpecificGearIssues = async () => {
        setIsFixingSpecific(true);

        try {
            await fixSpecificGearIssues();

            toast({
                title: "Specific Gear Fix Complete",
                description: "Problematic gear data has been cleaned up.",
                variant: "default",
            });

            // Re-validate after fixing
            await handleValidateData();
        } catch (error) {
            console.error('Specific fix error:', error);
            toast({
                title: "Fix Error",
                description: "An error occurred while fixing specific gear issues.",
                variant: "destructive",
            });
        } finally {
            setIsFixingSpecific(false);
        }
    };

    const handleRunMigration = async () => {
        setIsRunningMigration(true);

        try {
            const response = await fetch('/api/debug/run-migration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Migration Complete",
                    description: "Database migration has been applied successfully.",
                    variant: "default",
                });
                console.log('Migration results:', result.results);
            } else {
                toast({
                    title: "Migration Failed",
                    description: result.error || "An error occurred during migration.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Migration error:', error);
            toast({
                title: "Migration Error",
                description: "An error occurred while running the migration.",
                variant: "destructive",
            });
        } finally {
            setIsRunningMigration(false);
        }
    };

    const handleFixGearRequestRelationships = async () => {
        setIsFixingRelationships(true);

        try {
            const response = await fetch('/api/debug/fix-gear-request-relationships', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Relationships Fixed",
                    description: `Successfully fixed ${result.results.requests_fixed} gear request relationships.`,
                    variant: "default",
                });
                console.log('Relationship fix results:', result.results);
            } else {
                toast({
                    title: "Fix Failed",
                    description: result.error || "An error occurred while fixing relationships.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Relationship fix error:', error);
            toast({
                title: "Fix Error",
                description: "An error occurred while fixing gear request relationships.",
                variant: "destructive",
            });
        } finally {
            setIsFixingRelationships(false);
        }
    };

    // Debug function to check approved requests and their gears
    const debugApprovedRequests = async () => {
        setIsFixingRelationships(true); // Assuming isFixingRelationships is the loading state for this function
        try {
            console.log('🔍 Debugging approved requests and their gears...');

            // Get all approved requests
            const { data: approvedRequests, error: requestsError } = await supabase
                .from('gear_requests')
                .select('*')
                .eq('status', 'approved');

            if (requestsError) {
                console.error('Error fetching approved requests:', requestsError);
                toast({
                    title: "Error",
                    description: "Failed to fetch approved requests for debugging.",
                    variant: "destructive",
                });
                return;
            }

            console.log('📋 Approved requests found:', approvedRequests?.length || 0);

            // Check each approved request's gears
            for (const request of approvedRequests || []) {
                console.log(`\n🔍 Request ${request.id}:`);
                console.log(`   User ID: ${request.user_id}`);
                console.log(`   Gear IDs: ${request.gear_ids?.join(', ') || 'None'}`);
                console.log(`   Due Date: ${request.due_date}`);

                if (request.gear_ids && request.gear_ids.length > 0) {
                    // Check the status of each gear
                    const { data: gears, error: gearsError } = await supabase
                        .from('gears')
                        .select('id, name, status, checked_out_to, current_request_id, due_date')
                        .in('id', request.gear_ids);

                    if (gearsError) {
                        console.error(`   Error fetching gears for request ${request.id}:`, gearsError);
                    } else {
                        console.log(`   Gears in this request:`);
                        gears?.forEach((gear: any) => {
                            console.log(`     - ${gear.name} (${gear.id}):`);
                            console.log(`       Status: "${gear.status}"`);
                            console.log(`       Checked out to: ${gear.checked_out_to}`);
                            console.log(`       Current request: ${gear.current_request_id}`);
                            console.log(`       Due date: ${gear.due_date}`);

                            // Check if this gear should appear in check-in page
                            const shouldAppearInCheckin = gear.checked_out_to === request.user_id &&
                                (gear.status === 'Checked Out' || gear.status === 'Pending Check-in' || gear.status === 'Partially Checked Out');
                            console.log(`       Should appear in check-in: ${shouldAppearInCheckin}`);
                        });
                    }
                }
            }

            toast({
                title: "Debug Complete",
                description: "Check console for detailed debug information.",
                variant: "default",
            });
        } catch (error) {
            console.error('Debug error:', error);
            toast({
                title: "Debug Error",
                description: "An error occurred during debugging.",
                variant: "destructive",
            });
        } finally {
            setIsFixingRelationships(false);
        }
    };

    const handleFixDashboardCounts = async () => {
        setIsFixingDashboardCounts(true);

        try {
            const response = await fetch('/api/debug/fix-dashboard-counts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Dashboard Counts Fixed",
                    description: `Updated gear available quantities. Before: ${result.before.availableEquipment}, After: ${result.after.availableEquipment}`,
                    variant: "default",
                });
            } else {
                throw new Error(result.error || 'Failed to fix dashboard counts');
            }
        } catch (error) {
            console.error('Fix dashboard counts error:', error);
            toast({
                title: "Fix Error",
                description: "An error occurred while fixing dashboard counts.",
                variant: "destructive",
            });
        } finally {
            setIsFixingDashboardCounts(false);
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Database Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage database configurations and data integrity
                </p>
            </div>

            <div className="space-y-6">
                {/* Data Integrity Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Data Integrity Management
                        </CardTitle>
                        <CardDescription>
                            Validate and fix check-in data inconsistencies
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Check-in Data Issues</AlertTitle>
                            <AlertDescription>
                                These utilities help fix issues where users see items that need to be checked in
                                but have already been approved, and "Unknown Gear" appears in check-in history.
                            </AlertDescription>
                        </Alert>

                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Specific Gear Issues</AlertTitle>
                            <AlertDescription>
                                The "Fix Specific Gear Issues" button specifically targets gears that have
                                checked_out_to set but status is Available/Needs Repair, which causes them
                                to appear in user check-in pages incorrectly.
                            </AlertDescription>
                        </Alert>

                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Gear Request Relationships</AlertTitle>
                            <AlertDescription>
                                The "Fix Gear Request Relationships" button creates missing relationships between
                                gear requests and gears, which fixes the issue where gear names show as "1 gear(s) requested"
                                instead of actual gear names in the admin interface.
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-4 flex-wrap">
                            <Button
                                onClick={handleValidateData}
                                disabled={isValidating || isFixing || isFixingSpecific}
                                variant="outline"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Validate Data Integrity
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleFixData}
                                disabled={isValidating || isFixing || isFixingSpecific}
                                variant="default"
                            >
                                {isFixing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Fixing...
                                    </>
                                ) : (
                                    <>
                                        <Database className="mr-2 h-4 w-4" />
                                        Fix Data Inconsistencies
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleFixSpecificGearIssues}
                                disabled={isValidating || isFixing || isFixingSpecific || isRunningMigration}
                                variant="destructive"
                            >
                                {isFixingSpecific ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Fixing...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Fix Specific Gear Issues
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleRunMigration}
                                disabled={isValidating || isFixing || isFixingSpecific || isRunningMigration}
                                variant="outline"
                            >
                                {isRunningMigration ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Running Migration...
                                    </>
                                ) : (
                                    <>
                                        <Database className="mr-2 h-4 w-4" />
                                        Run Database Migration
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleFixGearRequestRelationships}
                                disabled={isValidating || isFixing || isFixingSpecific || isRunningMigration || isFixingRelationships}
                                variant="outline"
                            >
                                {isFixingRelationships ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Fixing Relationships...
                                    </>
                                ) : (
                                    <>
                                        <Database className="mr-2 h-4 w-4" />
                                        Fix Gear Request Relationships
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={debugApprovedRequests}
                                disabled={isValidating || isFixing || isFixingSpecific || isRunningMigration || isFixingRelationships}
                                variant="outline"
                            >
                                {isFixingRelationships ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Debugging...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Debug Approved Requests
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleFixDashboardCounts}
                                disabled={isValidating || isFixing || isFixingSpecific || isRunningMigration || isFixingRelationships || isFixingDashboardCounts}
                                variant="outline"
                            >
                                {isFixingDashboardCounts ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Fixing Dashboard Counts...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Fix Dashboard Counts
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Validation Results */}
                        {validationResults.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Validation Results:</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {validationResults.map((result, index) => (
                                        <div
                                            key={index}
                                            className={`text-sm p-2 rounded ${result.includes('✅')
                                                ? 'bg-green-50 text-green-800 border border-green-200'
                                                : result.includes('❌')
                                                    ? 'bg-red-50 text-red-800 border border-red-200'
                                                    : 'bg-gray-50 text-gray-800 border border-gray-200'
                                                }`}
                                        >
                                            {result}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Database Migration Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Migration Status</CardTitle>
                        <CardDescription>
                            Recent database migrations and their status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <h4 className="font-medium">Check-in Data Fixes</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Fixes gear-checkin relationships and data consistency
                                    </p>
                                </div>
                                <Badge variant="default">Applied</Badge>
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <h4 className="font-medium">Foreign Key Constraints</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Ensures proper relationships between tables
                                    </p>
                                </div>
                                <Badge variant="default">Applied</Badge>
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <h4 className="font-medium">Automatic Triggers</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically updates gear status on check-in approval
                                    </p>
                                </div>
                                <Badge variant="default">Applied</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 