'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiClient';

export default function TestDashboardCountsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [counts, setCounts] = useState<any>(null);

    const checkCounts = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/api/debug/fix-dashboard-counts');
            setCounts(response);
        } catch (error) {
            console.error('Error checking counts:', error);
            toast({
                title: 'Error',
                description: 'Failed to check dashboard counts',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const fixCounts = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/api/debug/fix-dashboard-counts', { method: 'POST' });
            setCounts(response);
            toast({
                title: 'Success',
                description: `Fixed dashboard counts. Before: ${response.before.availableEquipment}, After: ${response.after.availableEquipment}`,
            });
        } catch (error) {
            console.error('Error fixing counts:', error);
            toast({
                title: 'Error',
                description: 'Failed to fix dashboard counts',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkCounts();
    }, []);

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dashboard Counts Test</h1>
                <div className="space-x-2">
                    <Button onClick={checkCounts} disabled={loading} variant="outline">
                        Refresh
                    </Button>
                    <Button onClick={fixCounts} disabled={loading}>
                        {loading ? 'Processing...' : 'Fix Counts'}
                    </Button>
                </div>
            </div>

            {counts && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Counts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div>Total Equipment: {counts.currentCounts?.totalEquipment}</div>
                                <div>Available Equipment: {counts.currentCounts?.availableEquipment}</div>
                                <div>Checked Out Equipment: {counts.currentCounts?.checkedOutEquipment}</div>
                                <div>Under Repair Equipment: {counts.currentCounts?.underRepairEquipment}</div>
                                <div>Pending Check-in Equipment: {counts.currentCounts?.pendingCheckinEquipment}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {counts.before && counts.after && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Fix Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div>Before Available: {counts.before.availableEquipment}</div>
                                    <div>After Available: {counts.after.availableEquipment}</div>
                                    <div>Difference: {counts.before.availableEquipment - counts.after.availableEquipment}</div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {counts?.pendingCheckins && counts.pendingCheckins.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Check-ins ({counts.pendingCheckins.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {counts.pendingCheckins.map((checkin: any) => (
                                <div key={checkin.id} className="p-2 border rounded">
                                    <div className="font-medium">{checkin.gears?.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Checked in by {checkin.profiles?.full_name} on {new Date(checkin.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
