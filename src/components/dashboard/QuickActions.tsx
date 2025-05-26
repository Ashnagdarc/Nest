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
                <div className="w-full overflow-x-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-3 w-full">
                        {actions.map((action, index) => (
                            <motion.div
                                key={action.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link href={action.href} className="block w-full h-full">
                                    <Button
                                        variant={action.variant}
                                        className="w-full h-full min-h-[88px] flex-1 flex flex-col items-center justify-center gap-2 rounded-lg text-center break-words"
                                    >
                                        {action.icon}
                                        <div className="flex flex-col w-full text-center">
                                            <span className="text-sm font-medium break-words">{action.label}</span>
                                            <span className="text-xs font-normal opacity-80 break-words">{action.description}</span>
                                        </div>
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 