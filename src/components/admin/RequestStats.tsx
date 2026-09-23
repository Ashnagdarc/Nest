import React from 'react';
import {Card, CardContent} from "@/components/ui/card";

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

export function RequestStats({ isLoading, error, requestData }: RequestStatsProps) {
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
                    {requestData.map((item) => (
                        <div key={item.title}>
                            <Card className={`${item.bgColor} border-gray-700 hover:bg-gray-800/50 transition-all duration-200`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-300">{item.title}</p>
                                            <p className="text-2xl font-bold text-white">{item.value}</p>
                                            <p className="text-xs text-gray-400">{item.description}</p>
                                        </div>
                                        {React.createElement(item.icon, { className: `h-8 w-8 ${item.iconColor}` })}
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