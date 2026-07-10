"use client";

import Image from "next/image";
import { Settings2, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FleetCarRow = {
    id: string;
    label: string;
    plate?: string;
    status?: string;
    in_use: boolean;
    image_url?: string;
};

interface FleetCarCardProps {
    car: FleetCarRow;
    onViewBookings: (car: FleetCarRow) => void;
    onEditImage: (car: FleetCarRow) => void;
    onEditStatus: (car: FleetCarRow) => void;
}

export function FleetCarCard({ car, onViewBookings, onEditImage, onEditStatus }: FleetCarCardProps) {
    const isInService = car.in_use || car.status === "In Service";
    const isAvailable = car.status === "Available" && !car.in_use;

    const statusLabel = isInService ? "In trip" : car.status || "Offline";
    const statusClass = isInService
        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
        : isAvailable
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";

    return (
        <Card className="overflow-hidden border-border/50">
            <div className="relative h-36 w-full bg-muted">
                {car.image_url ? (
                    <Image
                        src={car.image_url}
                        alt={car.label}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                        <ImageIcon className="h-8 w-8" />
                    </div>
                )}
                <Badge className={cn("absolute left-3 top-3 border-0 font-normal", statusClass)}>
                    {statusLabel}
                </Badge>
            </div>
            <CardContent className="space-y-3 p-4">
                <button type="button" onClick={() => onViewBookings(car)} className="text-left">
                    <p className="font-semibold leading-tight hover:text-primary">{car.label}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {car.plate || "No plate"}
                    </p>
                </button>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 gap-1.5 text-xs"
                        onClick={() => onEditImage(car)}
                    >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Image
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 gap-1.5 text-xs"
                        onClick={() => onEditStatus(car)}
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                        Status
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
