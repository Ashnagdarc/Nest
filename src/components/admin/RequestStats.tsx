import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertTriangle, Package, Eye, ArrowRight, TrendingUp } from 'lucide-react';

interface RequestStats {
    new: number;
    pending: number;
    checkin: number;
    overdue: number;
}

interface RequestStatsProps {
    stats: RequestStats;
    onViewCategory: (category: keyof RequestStats) => void;
    isLoading: boolean;
    error?: string;
    requestData: { title: string; value: number; description: string; icon: React.ElementType; iconColor: string; bgColor: string }[];
}

export function RequestStats({ stats, onViewCategory, isLoading, error, requestData }: RequestStatsProps) {
    const categories = [
        {
            key: 'new' as keyof RequestStats,
            label: 'New Requests',
            description: 'Awaiting review',
            icon: Package,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-500/10',
            textColor: 'text-blue-400',
            borderColor: 'border-blue-500/30',
            glowColor: 'shadow-blue-500/20',
            priority: 'medium'
        },
        {
            key: 'pending' as keyof RequestStats,
            label: 'Pending Approval',
            description: 'In review process',
            icon: Clock,
            color: 'from-amber-500 to-orange-500',
            bgColor: 'bg-amber-500/10',
            textColor: 'text-amber-400',
            borderColor: 'border-amber-500/30',
            glowColor: 'shadow-amber-500/20',
            priority: 'high'
        },
        {
            key: 'checkin' as keyof RequestStats,
            label: 'Ready for Check-in',
            description: 'Due for return',
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-500/10',
            textColor: 'text-green-400',
            borderColor: 'border-green-500/30',
            glowColor: 'shadow-green-500/20',
            priority: 'low'
        },
        {
            key: 'overdue' as keyof RequestStats,
            label: 'Overdue Returns',
            description: 'Past due date',
            icon: AlertTriangle,
            color: 'from-red-500 to-red-600',
            bgColor: 'bg-red-500/10',
            textColor: 'text-red-400',
            borderColor: 'border-red-500/30',
            glowColor: 'shadow-red-500/20',
            priority: 'critical'
        }
    ];

    const totalRequests = Object.values(stats).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Request Statistics</h2>

            {isLoading ? (
                <div className="text-center p-4">
                    <div className="animate-spin">
                        <div className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="ml-2 text-sm text-gray-300">Loading request data...</span>
                </div>
            ) : error ? (
                <div className="text-red-400 p-4 text-center">{error}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {requestData.map((item, index) => (
                        <div key={item.title}>
                            <Card className={`${item.bgColor} border-gray-700 hover:bg-gray-800/50 transition-all duration-200`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-300">{item.title}</p>
                                            <p className="text-2xl font-bold text-white">{item.value}</p>
                                            <p className="text-xs text-gray-400">{item.description}</p>
                                        </div>
                                        <item.icon className={`h-8 w-8 ${item.iconColor}`} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 