/**
 * Pending Requests Section Component
 * 
 * Displays pending requests that need admin approval.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { EventDateFormatter } from "./EventDateFormatter";

interface PendingRequestsSectionProps {
    pendingEvents: any[];
}

export function PendingRequestsSection({ pendingEvents }: PendingRequestsSectionProps) {
    if (pendingEvents.length === 0) {
        return null;
    }

    return (
        <Card className="mt-4 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    Pending Approvals ({pendingEvents.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {pendingEvents.map((request: unknown) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex-1">
                                <p className="font-medium text-sm">
                                    Request #{request.id.slice(-6)}
                                </p>
                                <EventDateFormatter
                                    date={request.created_at}
                                    status="upcoming"
                                    className="text-xs"
                                />
                            </div>
                            <Badge className="bg-yellow-500 text-black">
                                Pending Approval
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 