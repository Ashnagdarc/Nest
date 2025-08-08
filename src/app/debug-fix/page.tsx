"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DebugFixPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [debugData, setDebugData] = useState<any>(null);
    const [fixResult, setFixResult] = useState<any>(null);

    const checkApprovedRequests = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/debug/check-approved-requests');
            const data = await response.json();

            if (response.ok) {
                setDebugData(data);
                toast({
                    title: "Debug Complete",
                    description: `Found ${data.summary.totalApprovedRequests} approved requests`,
                    variant: "default",
                });
            } else {
                toast({
                    title: "Debug Error",
                    description: data.error || "Failed to check approved requests",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Debug error:', error);
            toast({
                title: "Debug Error",
                description: "Failed to check approved requests",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fixApprovedRequests = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/debug/fix-approved-requests', {
                method: 'POST',
            });
            const data = await response.json();

            if (response.ok) {
                setFixResult(data);
                toast({
                    title: "Fix Complete",
                    description: `Updated ${data.summary.totalGearsUpdated} gears`,
                    variant: "default",
                });
            } else {
                toast({
                    title: "Fix Error",
                    description: data.error || "Failed to fix approved requests",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Fix error:', error);
            toast({
                title: "Fix Error",
                description: "Failed to fix approved requests",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Debug & Fix Approved Requests</h1>

            <div className="grid gap-6">
                {/* Action Buttons */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>
                            Debug and fix approved requests where gears aren't properly updated
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <Button
                                onClick={checkApprovedRequests}
                                disabled={isLoading}
                                variant="outline"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Check Approved Requests
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={fixApprovedRequests}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Fixing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Fix Approved Requests
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Debug Results */}
                {debugData && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Debug Results</CardTitle>
                            <CardDescription>
                                Current state of approved requests and their gears
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="p-3 bg-muted rounded">
                                        <div className="font-medium">Total Approved Requests</div>
                                        <div className="text-2xl font-bold">{debugData.summary.totalApprovedRequests}</div>
                                    </div>
                                    <div className="p-3 bg-muted rounded">
                                        <div className="font-medium">Requests with Gears</div>
                                        <div className="text-2xl font-bold">{debugData.summary.requestsWithGears}</div>
                                    </div>
                                    <div className="p-3 bg-muted rounded">
                                        <div className="font-medium">Gears Ready for Check-in</div>
                                        <div className="text-2xl font-bold">{debugData.summary.gearsThatShouldAppearInCheckin}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {debugData.data.map((request: any, index: number) => (
                                        <div key={index} className="p-4 border rounded">
                                            <h4 className="font-medium">Request {request.requestId}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                User: {request.userId} | Approved: {new Date(request.approvedAt).toLocaleString()}
                                            </p>
                                            <div className="mt-2 space-y-1">
                                                {request.gears.map((gear: any, gearIndex: number) => (
                                                    <div key={gearIndex} className="text-sm">
                                                        <span className="font-medium">{gear.name}:</span> {gear.status}
                                                        {gear.shouldAppearInCheckin ? (
                                                            <span className="ml-2 text-green-600">✓ Ready for check-in</span>
                                                        ) : (
                                                            <span className="ml-2 text-red-600">✗ Not ready</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Fix Results */}
                {fixResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Fix Results</CardTitle>
                            <CardDescription>
                                Results of the fix operation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Successfully updated {fixResult.summary.totalGearsUpdated} gears across {fixResult.summary.totalApprovedRequests} approved requests.
                                </AlertDescription>
                            </Alert>

                            <div className="mt-4 space-y-2">
                                {fixResult.summary.fixResults.map((result: any, index: number) => (
                                    <div key={index} className="text-sm p-2 bg-muted rounded">
                                        Request {result.requestId}: {result.gearsUpdated} gears updated
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
