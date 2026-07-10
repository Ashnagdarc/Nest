"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeLogo } from "@/components/ui/theme-logo";

interface AuthCardProps {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
    return (
        <Card className="border-border/60 shadow-lg">
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center lg:hidden">
                    <ThemeLogo width={56} height={56} className="h-14 w-14 rounded-lg" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
                    {description ? <CardDescription className="text-sm">{description}</CardDescription> : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {children}
                {footer ? <div className="border-t pt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
            </CardContent>
        </Card>
    );
}
