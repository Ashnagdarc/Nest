import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Camera, Package, ArrowUpDown, PlusCircle, Search, AlertTriangle, CalendarDays } from "lucide-react";

interface QuickAction {
    label: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    variant: "default" | "secondary" | "outline" | "destructive" | "ghost";
}

export function QuickActions() {
    const actions: QuickAction[] = [
        {
            label: "New Request",
            description: "Request equipment checkout",
            icon: <PlusCircle className="h-5 w-5" />,
            href: "/user/request",
            variant: "default"
        },
        {
            label: "Check In",
            description: "Return equipment",
            icon: <ArrowUpDown className="h-5 w-5" />,
            href: "/user/check-in",
            variant: "secondary"
        },
        {
            label: "Browse",
            description: "Search available equipment",
            icon: <Search className="h-5 w-5" />,
            href: "/user/browse",
            variant: "outline"
        },
        {
            label: "My Requests",
            description: "View your requests",
            icon: <Package className="h-5 w-5" />,
            href: "/user/my-requests",
            variant: "outline"
        },
        {
            label: "Report Issue",
            description: "Report equipment problem",
            icon: <AlertTriangle className="h-5 w-5" />,
            href: "/user/report",
            variant: "destructive"
        },
        {
            label: "Calendar",
            description: "View equipment schedule",
            icon: <CalendarDays className="h-5 w-5" />,
            href: "/user/calendar",
            variant: "outline"
        },
    ];

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-md">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={action.href}>
                                <Button
                                    variant={action.variant}
                                    className="w-full h-auto py-4 px-2 flex flex-col items-center justify-center gap-2"
                                >
                                    {action.icon}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{action.label}</span>
                                        <span className="text-xs font-normal opacity-80">{action.description}</span>
                                    </div>
                                </Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 