"use client";

import { ReactNode } from "react";

interface AuthCardProps {
    title: string;
    description?: string;
    children?: ReactNode;
    footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
            </div>
            <div className="space-y-6">
                {children}
                {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
            </div>
        </div>
    );
}
