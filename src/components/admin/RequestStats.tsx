import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/aceternity";
import { motion, AnimatePresence } from 'framer-motion';
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
}

export function RequestStats({ stats, onViewCategory }: RequestStatsProps) {
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
            {/* Header with gradient accent */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg" />
                <div className="relative p-4 rounded-lg border border-gray-700/50 bg-gray-800/20 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                                <Package className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Equipment Requests</h2>
                                <p className="text-sm text-gray-400">Manage request pipeline</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{totalRequests}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Total
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Request Cards Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.key}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                delay: index * 0.1,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                            }}
                            whileHover={{
                                scale: 1.03,
                                rotateY: 5,
                                z: 50
                            }}
                            whileTap={{ scale: 0.97 }}
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            <Card
                                className={`
                                    cursor-pointer h-full relative overflow-hidden group
                                    bg-gray-800/40 border ${category.borderColor} 
                                    hover:bg-gray-800/60 hover:${category.glowColor}
                                    transition-all duration-300 backdrop-blur-sm
                                    hover:shadow-lg hover:shadow-current/20
                                `}
                                onClick={() => onViewCategory(category.key)}
                            >
                                {/* Animated background gradient */}
                                <div className={`
                                    absolute inset-0 bg-gradient-to-br ${category.color} 
                                    opacity-0 group-hover:opacity-10 transition-opacity duration-500
                                `} />

                                {/* Floating particles effect */}
                                <div className="absolute inset-0 overflow-hidden">
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className={`absolute w-1 h-1 ${category.bgColor} rounded-full`}
                                            style={{
                                                top: `${20 + i * 30}%`,
                                                left: `${10 + i * 25}%`,
                                            }}
                                            animate={{
                                                y: [-5, 5, -5],
                                                opacity: [0.3, 0.8, 0.3],
                                            }}
                                            transition={{
                                                duration: 2 + i,
                                                repeat: Infinity,
                                                delay: i * 0.5,
                                            }}
                                        />
                                    ))}
                                </div>

                                <CardContent className="p-4 relative z-10">
                                    <div className="space-y-3">
                                        {/* Header with enhanced icon */}
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <motion.div
                                                        className={`
                                                            p-2.5 rounded-xl bg-gradient-to-br ${category.color} 
                                                            shadow-lg group-hover:scale-110 group-hover:rotate-3
                                                            transition-all duration-300
                                                        `}
                                                        whileHover={{ rotate: 12 }}
                                                    >
                                                        <category.icon className="h-4 w-4 text-white" />
                                                    </motion.div>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white leading-tight">
                                                        {category.label}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {category.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Priority badge */}
                                            {category.priority === 'critical' && stats[category.key] > 0 && (
                                                <motion.div
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                >
                                                    <Badge variant="destructive" className="text-xs font-medium">
                                                        URGENT
                                                    </Badge>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Stats display */}
                                        <div className="flex items-end justify-between">
                                            <div className="space-y-1">
                                                <motion.div
                                                    className="text-3xl font-bold text-white"
                                                    initial={{ scale: 1 }}
                                                    animate={{
                                                        scale: stats[category.key] > 0 ? [1, 1.1, 1] : 1
                                                    }}
                                                    transition={{
                                                        duration: 0.6,
                                                        delay: index * 0.1,
                                                        repeat: stats[category.key] > 0 ? Infinity : 0,
                                                        repeatDelay: 3
                                                    }}
                                                >
                                                    {stats[category.key]}
                                                </motion.div>

                                                {/* Progress indicator */}
                                                {totalRequests > 0 && (
                                                    <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className={`h-full bg-gradient-to-r ${category.color}`}
                                                            initial={{ width: 0 }}
                                                            animate={{
                                                                width: `${(stats[category.key] / totalRequests) * 100}%`
                                                            }}
                                                            transition={{
                                                                duration: 1,
                                                                delay: index * 0.1 + 0.5
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action button */}
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`
                                                        ${category.textColor} hover:${category.bgColor}
                                                        border border-transparent hover:border-current/20
                                                        transition-all duration-200 p-2 rounded-lg
                                                        group-hover:bg-white/5
                                                    `}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewCategory(category.key);
                                                    }}
                                                >
                                                    <ArrowRight className="h-3 w-3" />
                                                </Button>
                                            </motion.div>
                                        </div>
                                    </div>
                                </CardContent>

                                {/* Enhanced pulse effect for critical items */}
                                {category.priority === 'critical' && stats[category.key] > 0 && (
                                    <motion.div
                                        className="absolute inset-0 rounded-lg border-2 border-red-400/50"
                                        animate={{
                                            opacity: [0, 0.6, 0],
                                            scale: [1, 1.02, 1]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    />
                                )}

                                {/* Shine effect on hover */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
} 