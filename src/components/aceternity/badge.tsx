"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    {
                        "border-transparent bg-blue-600 text-white dark:bg-blue-500": variant === "default",
                        "border-transparent bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100": variant === "secondary",
                        "border-transparent bg-red-600 text-white dark:bg-red-500": variant === "destructive",
                        "border-gray-300 text-gray-900 dark:border-gray-600 dark:text-gray-100": variant === "outline",
                        "border-transparent bg-green-600 text-white dark:bg-green-500": variant === "success",
                        "border-transparent bg-yellow-600 text-white dark:bg-yellow-500": variant === "warning",
                    },
                    className
                )}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
                {children}
            </motion.div>
        );
    }
);
Badge.displayName = "Badge";

export { Badge }; 