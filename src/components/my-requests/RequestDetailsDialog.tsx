import type { ComponentType } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Package,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookingStatusBadge } from "@/components/ui/booking-status-badge";
import {
  canCancelRequest,
  getRequestContextLabel,
  type GearRequestItem,
} from "@/components/my-requests/types";
import { cn } from "@/lib/utils";

interface RequestDetailsDialogProps {
  request: GearRequestItem | null;
  open: boolean;
  currentUserId: string | null;
  isCancelling?: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (requestId: string) => void;
}

function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatTime(dateString: string) {
  try {
    return format(new Date(dateString), "h:mm a");
  } catch {
    return "";
  }
}

function statusAccentClass(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "pending":
      return "from-amber-500/80 to-amber-500/20";
    case "approved":
    case "checked out":
      return "from-emerald-500/80 to-emerald-500/20";
    case "rejected":
    case "cancelled":
      return "from-rose-500/80 to-rose-500/20";
    case "completed":
    case "returned":
    case "checked in":
      return "from-slate-500/80 to-slate-500/20";
    default:
      return "from-primary/80 to-primary/20";
  }
}

function DetailTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <p className="text-sm font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
}

function PersonTile({
  label,
  name,
  email,
}: {
  label: string;
  name: string;
  email?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{name}</p>
        {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
      </div>
    </div>
  );
}

export function RequestDetailsDialog({
  request,
  open,
  currentUserId,
  isCancelling = false,
  onOpenChange,
  onCancel,
}: RequestDetailsDialogProps) {
  if (!request) return null;

  const contextLabel = getRequestContextLabel(request, currentUserId);
  const showCancel = canCancelRequest(request, currentUserId);
  const itemCount = request.gears.length;
  const unitCount = request.gears.reduce((sum, g) => sum + g.quantity, 0);
  const isOnBehalf =
    request.submitted_by_user_id && request.submitted_by_user_id !== request.user_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div
          className={cn(
            "h-1.5 w-full bg-gradient-to-r",
            statusAccentClass(request.status),
          )}
        />

        <DialogHeader className="space-y-3 border-b border-border px-6 pb-4 pt-5 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-xl">Request details</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                #{request.id.slice(0, 8)}
              </DialogDescription>
            </div>
            <BookingStatusBadge status={request.status} className="text-xs" />
          </div>

          {contextLabel && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
              {contextLabel}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <DetailTile
              icon={Calendar}
              label="Submitted"
              value={`${formatDate(request.created_at)}${formatTime(request.created_at) ? ` · ${formatTime(request.created_at)}` : ""}`}
            />
            <DetailTile
              icon={MapPin}
              label="Destination"
              value={request.destination || "Not specified"}
            />
            <DetailTile
              icon={Clock}
              label="Duration"
              value={request.expected_duration || "Not specified"}
            />
          </div>

          {request.reason && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reason
              </p>
              <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground">
                {request.reason}
              </p>
            </div>
          )}

          {(isOnBehalf || request.team_members) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                People
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {request.profiles && (
                  <PersonTile
                    label="Equipment for"
                    name={request.profiles.full_name || request.profiles.email || "Unknown"}
                    email={request.profiles.email}
                  />
                )}
                {isOnBehalf && request.submitted_by && (
                  <PersonTile
                    label="Submitted by"
                    name={
                      request.submitted_by.full_name ||
                      request.submitted_by.email ||
                      "Unknown"
                    }
                    email={request.submitted_by.email}
                  />
                )}
                {request.team_members && (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:col-span-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Team members included</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Equipment</h4>
              </div>
              {itemCount > 0 && (
                <Badge variant="secondary" className="rounded-full font-normal">
                  {itemCount} item{itemCount !== 1 ? "s" : ""} · {unitCount} unit
                  {unitCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {itemCount > 0 ? (
              <ScrollArea className="h-[min(280px,40vh)] rounded-xl border border-border">
                <div className="divide-y divide-border">
                  {request.gears.map((gear) => (
                    <div
                      key={gear.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{gear.name || "Equipment"}</p>
                        {gear.category && (
                          <p className="text-xs text-muted-foreground">{gear.category}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        ×{gear.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                No equipment listed on this request.
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="border-t border-border bg-muted/10 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {showCancel && (
            <Button
              variant="destructive"
              disabled={isCancelling}
              onClick={() => onCancel(request.id)}
            >
              {isCancelling ? "Cancelling…" : "Cancel request"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
