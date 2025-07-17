import React from 'react';

interface BentoGridProps {
    children: React.ReactNode;
    className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => (
    <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full ${className}`}
    >
        {children}
    </div>
); 