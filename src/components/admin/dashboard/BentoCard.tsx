import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from '@/lib/motion-fallback';

interface BentoCardProps {
    icon?: React.ReactNode;
    title: string;
    value: number;
    subtitle?: string;
    color?: string;
    loading?: boolean;
    onClick?: () => void;
    progress?: number; // 0-100 for progress bar
    progressLabel?: string;
}

// Simple count-up animation
function useCountUp(target: number, duration = 800) {
    const [count, setCount] = useState(0);
    const raf = useRef<number | null>(null);
    useEffect(() => {
        let start: number | null = null;
        function step(ts: number) {
            if (start === null) start = ts;
            const elapsed = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            setCount(Math.round(progress * target));
            if (progress < 1) raf.current = requestAnimationFrame(step);
        }
        raf.current = requestAnimationFrame(step);
        return () => {
            if (raf.current !== null) cancelAnimationFrame(raf.current);
        };
    }, [target, duration]);
    return count;
}

export const BentoCard: React.FC<BentoCardProps> = ({
    icon,
    title,
    value,
    subtitle,
    color = '',
    loading = false,
    onClick,
    progress,
    progressLabel,
}) => {
    const animatedValue = useCountUp(typeof value === 'number' ? value : 0);
    return (
        <motion.div
            className="transition-transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            onClick={onClick}
        >
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-lg rounded-xl">
                <CardContent className="flex flex-col gap-2 p-6">
                    <div className="flex items-center gap-3 mb-1">
                        {icon && <span className={`text-2xl ${color}`}>{icon}</span>}
                        <span className="text-lg font-semibold text-white">{title}</span>
                    </div>
                    <div className="text-3xl font-bold text-white mt-2">
                        {loading ? <span className="animate-pulse">...</span> : animatedValue}
                    </div>
                    {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
                    {typeof progress === 'number' && (
                        <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">{progressLabel || 'Progress'}</span>
                                <span className="text-white">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}; 