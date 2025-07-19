import { cn } from '@/lib/utils';
import { getResponsiveContainer } from '@/utils/responsive';

interface ResponsiveContainerProps {
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveContainer = ({
    children,
    size = 'lg',
    className,
    as: Component = 'div'
}: ResponsiveContainerProps) => {
    return (
        <Component className={cn(getResponsiveContainer(size), className)}>
            {children}
        </Component>
    );
}; 