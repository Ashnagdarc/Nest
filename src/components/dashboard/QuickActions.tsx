import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, ArrowUpDown, PlusCircle, Search, Car, Megaphone } from "lucide-react";

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
            label: "Book a Car",
            description: "Request a car booking",
            icon: <Car className="h-5 w-5" />,
            href: "/user/car-booking",
            variant: "outline"
        },
        {
            label: "Announcements",
            description: "Latest company updates",
            icon: <Megaphone className="h-5 w-5" />,
            href: "/user/announcements",
            variant: "ghost"
        },
    ];

    return (
        <Card className="border-border/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.label}
                            className="min-w-0"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                asChild
                                variant={action.variant}
                                className="flex h-auto min-h-[100px] w-full min-w-0 flex-col items-center justify-center gap-2 !whitespace-normal rounded-xl px-2 py-3 text-center transition-all duration-200"
                                aria-label={action.label}
                            >
                                <Link href={action.href} prefetch={false} tabIndex={0}>
                                    <div className="flex w-full min-w-0 flex-col items-center gap-2">
                                        {action.icon}
                                        <div className="flex w-full min-w-0 flex-col space-y-1 text-center">
                                            <span className="text-sm font-medium leading-snug break-words">{action.label}</span>
                                            <span className="text-xs font-normal leading-snug break-words text-muted-foreground">{action.description}</span>
                                        </div>
                                    </div>
                                </Link>
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 