"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    withSpotlight?: boolean;
    withHover?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, children, withSpotlight = false, withHover = true, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl",
                    "before:absolute before:inset-0 before:rounded-2xl before:border before:border-white/20 before:opacity-0 before:transition-opacity before:duration-500",
                    withHover && "hover:before:opacity-100",
                    withSpotlight && "hover:shadow-2xl hover:shadow-blue-500/25",
                    className
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                whileHover={withHover ? { scale: 1.02, y: -5 } : undefined}
                {...props}
            >
                {withSpotlight && (
                    <motion.div
                        className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
                        initial={false}
                        animate={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                    />
                )}

                <div className="relative z-10">
                    {children}
                </div>

                {/* Animated background gradient */}
                <div className="absolute inset-0 -z-10 opacity-30">
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10"
                        animate={{
                            background: [
                                "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))",
                                "linear-gradient(225deg, rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
                                "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))",
                            ],
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            </motion.div>
        );
    }
);
GlassCard.displayName = "GlassCard";

export const GlassCardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 pb-4", className)}
        {...props}
    />
));
GlassCardHeader.displayName = "GlassCardHeader";

export const GlassCardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "bg-gradient-to-r from-white to-gray-300 bg-clip-text text-lg font-semibold leading-none tracking-tight text-transparent",
            className
        )}
        {...props}
    />
));
GlassCardTitle.displayName = "GlassCardTitle";

export const GlassCardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-gray-200", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent"; 