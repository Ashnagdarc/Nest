// Temporary fallback for motion components to fix infinite loop issues
import React from 'react';

export const motion = {
    div: ({ children, className, ...props }: any) => (
        <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
        <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, ...props }: any) => (
        <button className={className} {...props}>{children}</button>
    ),
};

export const AnimatePresence = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
);

export const LayoutGroup = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
); 