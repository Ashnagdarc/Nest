"use client";

import { CheckCircle, ChevronRight, Eye, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RequestRowActionsProps {
    isPending: boolean;
    isProcessing: boolean;
    isThisProcessing: boolean;
    onApprove: () => void;
    onReject: () => void;
    onView: () => void;
    compact?: boolean;
}

export function RequestRowActions({
    isPending,
    isProcessing,
    isThisProcessing,
    onApprove,
    onReject,
    onView,
    compact = false,
}: RequestRowActionsProps) {
    if (compact) {
        return (
            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                {isPending && (
                    <div className="flex gap-1">
                        <Button
                            size="sm"
                            className="h-8 flex-1 gap-1 bg-green-600 text-white hover:bg-green-700"
                            disabled={isProcessing}
                            onClick={onApprove}
                        >
                            {isThisProcessing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={isProcessing}
                            onClick={onReject}
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                        </Button>
                    </div>
                )}
                <Button size="sm" variant="secondary" className="h-8 w-full gap-1.5" onClick={onView}>
                    <Eye className="h-3.5 w-3.5" />
                    View details
                </Button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "inline-flex items-center justify-end gap-1.5",
                isPending && "rounded-lg border bg-muted/30 p-1"
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {isPending && (
                <>
                    <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-green-600 px-3 text-white shadow-sm hover:bg-green-700"
                        disabled={isProcessing}
                        onClick={onApprove}
                    >
                        {isThisProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden lg:inline">Approve</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={isProcessing}
                        onClick={onReject}
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">Reject</span>
                    </Button>
                    <div className="mx-0.5 hidden h-6 w-px bg-border lg:block" aria-hidden />
                </>
            )}
            <Button
                size="sm"
                variant={isPending ? "ghost" : "outline"}
                className={cn(
                    "h-8 gap-1.5 px-3",
                    !isPending && "border-primary/20 bg-background shadow-sm hover:bg-accent"
                )}
                onClick={onView}
            >
                <Eye className="h-3.5 w-3.5" />
                {isPending ? (
                    <span className="hidden xl:inline">Details</span>
                ) : (
                    <>
                        View
                        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    </>
                )}
            </Button>
        </div>
    );
}
