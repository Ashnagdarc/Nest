"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
    BarChart3,
    Car,
    ClipboardList,
    Plus,
    RefreshCcw,
    Upload,
    Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import AddGearForm from "@/components/admin/add-gear-form";

const actions = [
    {
        label: "Manage Requests",
        description: "Review pending gear requests",
        icon: ClipboardList,
        href: "/admin/manage-requests",
        variant: "secondary" as const,
    },
    {
        label: "Manage Check-ins",
        description: "Approve gear returns",
        icon: Upload,
        href: "/admin/manage-checkins",
        variant: "outline" as const,
    },
    {
        label: "Car Bookings",
        description: "Review transport requests",
        icon: Car,
        href: "/admin/manage-car-bookings",
        variant: "outline" as const,
    },
    {
        label: "Users",
        description: "Manage accounts and roles",
        icon: Users,
        href: "/admin/manage-users",
        variant: "outline" as const,
    },
    {
        label: "Reports",
        description: "Analytics and exports",
        icon: BarChart3,
        href: "/admin/reports",
        variant: "ghost" as const,
    },
];

interface AdminQuickActionsProps {
    onRefresh?: () => void;
}

export function AdminQuickActions({ onRefresh }: AdminQuickActionsProps) {
    const [addGearOpen, setAddGearOpen] = useState(false);

    return (
        <Card className="border-border/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    <Dialog open={addGearOpen} onOpenChange={setAddGearOpen}>
                        <DialogTrigger asChild>
                            <Button className="min-h-[100px] h-auto w-full flex-col gap-2 rounded-xl">
                                <Plus className="h-5 w-5" />
                                <span className="text-sm font-medium">Add Equipment</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add new equipment</DialogTitle>
                            </DialogHeader>
                            <AddGearForm onSubmit={() => setAddGearOpen(false)} />
                        </DialogContent>
                    </Dialog>

                    {actions.map((action, index) => (
                        <motion.div
                            key={action.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                            <Button
                                asChild
                                variant={action.variant}
                                className="min-h-[100px] h-auto w-full flex-col gap-2 rounded-xl text-center"
                            >
                                <Link href={action.href}>
                                    <action.icon className="h-5 w-5" />
                                    <span className="text-sm font-medium">{action.label}</span>
                                    <span className="text-xs text-muted-foreground line-clamp-2">
                                        {action.description}
                                    </span>
                                </Link>
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {onRefresh ? (
                    <Button variant="outline" className="w-full gap-2" onClick={onRefresh}>
                        <RefreshCcw className="h-4 w-4" />
                        Refresh dashboard
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    );
}
