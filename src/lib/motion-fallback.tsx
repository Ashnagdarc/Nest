// Temporary fallback for motion components to fix infinite loop issues
import React from 'react';

export const motion = {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }> & Record<string, unknown>) => (
        <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }> & Record<string, unknown>) => (
        <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }> & Record<string, unknown>) => (
        <button className={className} {...props}>{children}</button>
    ),
};

export const AnimatePresence = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
);

export const LayoutGroup = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
); 