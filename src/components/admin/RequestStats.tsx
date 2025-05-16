import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface RequestStats {
    new: number;
    pending: number;
    checkin: number;
    overdue: number;
}

interface RequestStatsProps {
    stats: RequestStats;
    onViewCategory: (category: keyof RequestStats) => void;
}

export function RequestStats({ stats, onViewCategory }: RequestStatsProps) {
    const categories = [
        {
            key: 'new' as keyof RequestStats,
            label: 'New Requests',
            description: 'Requests awaiting initial review',
            icon: Package,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500'
        },
        {
            key: 'pending' as keyof RequestStats,
            label: 'Pending Approval',
            description: 'Requests in review process',
            icon: Clock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500'
        },
        {
            key: 'checkin' as keyof RequestStats,
            label: 'Ready for Check-in',
            description: 'Equipment due for return',
            icon: CheckCircle,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500'
        },
        {
            key: 'overdue' as keyof RequestStats,
            label: 'Overdue Returns',
            description: 'Past due date equipment',
            icon: AlertTriangle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500'
        }
    ];

    return (
        <div className="flex flex-wrap -mx-1.5">
            {categories.map((category, index) => (
                <motion.div
                    key={category.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-full xs:w-1/2 xl:w-1/4 p-1.5"
                >
                    <Card
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${category.borderColor} h-full`}
                        onClick={() => onViewCategory(category.key)}
                    >
                        <CardHeader className="pb-1 px-3 pt-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {category.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <div className="flex items-center justify-between flex-wrap xs:flex-nowrap">
                                <div className="flex items-center gap-2 w-full xs:w-auto">
                                    <div className={`p-2 rounded-full ${category.bgColor} flex-shrink-0`}>
                                        <category.icon className={`h-5 w-5 ${category.color}`} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">
                                            {stats[category.key]}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {category.description}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`${category.color} hover:${category.bgColor} mt-2 xs:mt-0 w-full xs:w-auto`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewCategory(category.key);
                                    }}
                                >
                                    View
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
} 