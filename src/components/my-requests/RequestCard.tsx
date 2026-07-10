import { format } from "date-fns";
import { Calendar, MapPin, Package, Users, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/ui/booking-status-badge";
import {
  canCancelRequest,
  getRequestContextLabel,
  type GearRequestItem,
} from "@/components/my-requests/types";
import { cn } from "@/lib/utils";

interface RequestCardProps {
  request: GearRequestItem;
  currentUserId: string | null;
  highlighted?: boolean;
  isCancelling?: boolean;
  onView: (request: GearRequestItem) => void;
  onCancel: (requestId: string) => void;
}

function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function gearSummary(gears: GearRequestItem["gears"]) {
  if (!gears.length) return "No equipment listed";
  const primary = gears[0];
  const name = primary.name || "Equipment";
  const extra = gears.length > 1 ? ` +${gears.length - 1} more` : "";
  const qty = primary.quantity > 1 ? ` ×${primary.quantity}` : "";
  return `${name}${qty}${extra}`;
}

export function RequestCard({
  request,
  currentUserId,
  highlighted = false,
  isCancelling = false,
  onView,
  onCancel,
}: RequestCardProps) {
  const contextLabel = getRequestContextLabel(request, currentUserId);
  const showCancel = canCancelRequest(request, currentUserId);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      id={`request-${request.id}`}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        highlighted && "ring-2 ring-primary/30",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => onView(request)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-foreground">{gearSummary(request.gears)}</h3>
                <BookingStatusBadge status={request.status} />
              </div>
              {contextLabel && (
                <p className="text-xs font-medium text-primary">{contextLabel}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(request.created_at)}
                </span>
                {request.destination && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {request.destination}
                  </span>
                )}
                {request.expected_duration && (
                  <span>{request.expected_duration}</span>
                )}
              </div>
              {request.reason && (
                <p className="line-clamp-1 text-sm text-muted-foreground">{request.reason}</p>
              )}
              {request.team_members && (
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Team included
                </p>
              )}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
          <Button variant="outline" size="sm" onClick={() => onView(request)}>
            Details
          </Button>
          {showCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onCancel(request.id)}
              disabled={isCancelling}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              {isCancelling ? "Cancelling…" : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
