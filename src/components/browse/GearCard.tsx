"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Box, PackagePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/utils/category";
import { getGearAvailability, type AvailabilityLevel, type BrowseGear } from "@/components/browse/types";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<AvailabilityLevel, string> = {
    available: "bg-emerald-500/90 text-white",
    partial: "bg-amber-500/90 text-white",
    booked: "bg-red-500/90 text-white",
    unavailable: "bg-muted/90 text-muted-foreground",
};

const STATUS_SHORT: Record<AvailabilityLevel, string> = {
    available: "Available",
    partial: "Limited",
    booked: "Checked Out",
    unavailable: "Unavailable",
};

const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
};

function availabilitySummary(available: number, total: number, level: AvailabilityLevel): string {
    if (level === "unavailable") return "Not available for request";
    if (level === "booked") return total > 1 ? `All ${total} checked out` : "Checked out";
    if (level === "partial") return `${available} of ${total} available`;
    return total > 1 ? `${available} of ${total} available` : "Available";
}

export function GearCard({ gear }: { gear: BrowseGear }) {
    const availability = getGearAvailability(gear);

    return (
        <motion.div variants={itemVariants} className="h-full">
            <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted m-3 mb-0 rounded-xl">
                    {gear.image_url ? (
                        <Image
                            src={gear.image_url}
                            alt={gear.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Box className="h-10 w-10 opacity-40" />
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span
                        className={cn(
                            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
                            STATUS_BADGE[availability.level]
                        )}
                    >
                        {availability.level === "unavailable" && gear.status
                            ? gear.status
                            : STATUS_SHORT[availability.level]}
                    </span>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-grow p-4 pt-3 space-y-2">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                        {gear.name}
                    </h3>

                    {gear.category && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            {getCategoryIcon(gear.category, 14)}
                            <span className="truncate">{gear.category}</span>
                        </div>
                    )}

                    <p className="text-sm text-muted-foreground">
                        {availabilitySummary(availability.available, availability.total, availability.level)}
                    </p>

                    <div className="flex-grow" />

                    {availability.requestable ? (
                        <Button asChild className="w-full min-h-[44px] rounded-xl mt-2">
                            <Link href={`/user/request?gearId=${gear.id}`} aria-label={`Request ${gear.name}`}>
                                <PackagePlus className="mr-2 h-4 w-4" />
                                Request
                            </Link>
                        </Button>
                    ) : (
                        <Button disabled variant="secondary" className="w-full min-h-[44px] rounded-xl mt-2">
                            {availability.level === "booked" ? "Checked Out" : "Unavailable"}
                        </Button>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}
