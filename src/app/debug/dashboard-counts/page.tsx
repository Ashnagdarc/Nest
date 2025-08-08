'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiClient';
import { Package, CheckCircle, Clock, AlertTriangle, Wrench } from 'lucide-react';

interface DashboardCounts {
    totalEquipment: number;
    availableEquipment: number;
    checkedOutEquipment: number;
    underRepairEquipment: number;
    pendingCheckinEquipment: number;
}

interface PendingCheckin {
    id: string;
    gear_id: string;
    user_id: string;
    status: string;
    created_at: string;
    gears: { name: string };
    profiles: { full_name: string };
}

interface GearWithIssue {
    id: string;
    name: string;
    status: string;
    quantity: number;
    available_quantity: number;
    checked_out_to: string | null;
}

export default function DashboardCountsDebugPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [fixing, setFixing] = useState(false);
    const [counts, setCounts] = useState<DashboardCounts | null>(null);
    const [pendingCheckins, setPendingCheckins] = useState<PendingCheckin[]>([]);
    const [gearsWithIssues, setGearsWithIssues] = useState<GearWithIssue[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiGet<{
                success: boolean;
                currentCounts: DashboardCounts;
                pendingCheckins: PendingCheckin[];
                gearsWithIssues: GearWithIssue[];
                summary: any;
            }>('/api/debug/fix-dashboard-counts');

            if (response.success) {
                setCounts(response.currentCounts);
                setPendingCheckins(response.pendingCheckins);
                setGearsWithIssues(response.gearsWithIssues);
            } else {
                setError('Failed to fetch dashboard data');
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fixCounts = async () => {
        try {
            setFixing(true);
            setError(null);

            const response = await apiGet<{
                success: boolean;
                message: string;
                before: DashboardCounts;
                after: DashboardCounts;
                pendingCheckins: PendingCheckin[];
                summary: any;
            }>('/api/debug/fix-dashboard-counts', { method: 'POST' });

            if (response.success) {
                setCounts(response.after);
                setPendingCheckins(response.pendingCheckins);
                toast({
                    title: 'Dashboard counts fixed',
                    description: response.message,
                });
            } else {
                setError('Failed to fix dashboard counts');
            }
        } catch (err) {
            console.error('Error fixing dashboard counts:', err);
            setError('Failed to fix dashboard counts');
        } finally {
            setFixing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading dashboard data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Dashboard Counts Debug</h1>
                <div className="space-x-2">
                    <Button onClick={fetchData} variant="outline">
                        Refresh
                    </Button>
                    <Button onClick={fixCounts} disabled={fixing}>
                        {fixing ? 'Fixing...' : 'Fix Counts'}
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {counts && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts.totalEquipment}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{counts.availableEquipment}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
                            <Clock className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{counts.checkedOutEquipment}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Under Repair</CardTitle>
                            <Wrench className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{counts.underRepairEquipment}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Check-in</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{counts.pendingCheckinEquipment}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {pendingCheckins.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Pending Check-ins ({pendingCheckins.length})
                            <Badge variant="secondary">These items are checked in but not approved</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pendingCheckins.map((checkin) => (
                                <div key={checkin.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{checkin.gears.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Checked in by {checkin.profiles.full_name}
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(checkin.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {gearsWithIssues.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Gears with Issues ({gearsWithIssues.length})
                            <Badge variant="destructive">These gears have incorrect available_quantity</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {gearsWithIssues.map((gear) => (
                                <div key={gear.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{gear.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Status: {gear.status} | Quantity: {gear.quantity} | Available: {gear.available_quantity}
                                        </div>
                                    </div>
                                    <Badge variant="outline">
                                        {gear.checked_out_to ? 'Checked Out' : 'Available'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>How to Fix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">The Problem:</h4>
                        <p className="text-sm text-muted-foreground">
                            When items are checked in but not yet approved by an admin, they have a status of "Pending Check-in"
                            but their `available_quantity` field is not updated until admin approval. This causes a discrepancy
                            between admin and user dashboard gear counts.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">The Solution:</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Click "Fix Counts" to update all gear `available_quantity` values</li>
                            <li>Apply the database migration to add automatic triggers</li>
                            <li>The triggers will maintain accurate counts going forward</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">Database Migration:</h4>
                        <p className="text-sm text-muted-foreground">
                            Run the migration file: <code className="bg-muted px-1 rounded">supabase/migrations/20241204_add_quantity_fields_to_gears.sql</code>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
