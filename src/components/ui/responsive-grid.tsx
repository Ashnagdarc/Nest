import { cn } from '@/lib/utils';
import { getResponsiveGrid } from '@/utils/responsive';

interface ResponsiveGridProps {
    children: React.ReactNode;
    mobileCols?: number;
    tabletCols?: number;
    desktopCols?: number;
    xlCols?: number;
    gap?: string;
    className?: string;
}

export const ResponsiveGrid = ({
    children,
    mobileCols = 1,
    tabletCols = 2,
    desktopCols = 3,
    xlCols = 4,
    gap = 'gap-4 md:gap-6 lg:gap-8',
    className
}: ResponsiveGridProps) => {
    return (
        <div className={cn(getResponsiveGrid(mobileCols, tabletCols, desktopCols, xlCols), gap, className)}>
            {children}
        </div>
    );
}; 