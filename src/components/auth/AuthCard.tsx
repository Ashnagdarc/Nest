"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeLogo } from "@/components/ui/theme-logo";

interface AuthCardProps {
    title: string;
    description?: string;
    backHref?: string;
    children: ReactNode;
    logoSize?: number; // px
}

export function AuthCard({
    title,
    description,
    backHref = "/",
    children,
    logoSize = 96,
}: AuthCardProps) {
    return (
        <Card className="shadow-lg rounded-lg border-border/50">
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-between items-start">
                    <Link
                        href={backHref}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                    <div className="flex-1" />
                </div>
                <div className="flex justify-center">
                    <ThemeLogo width={logoSize} height={logoSize} className="w-24 h-24 rounded-lg" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-primary">{title}</CardTitle>
                    {description ? (
                        <CardDescription>{description}</CardDescription>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
