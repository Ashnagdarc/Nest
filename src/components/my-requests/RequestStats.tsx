import { CheckCircle, Clock, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RequestStats } from "@/components/my-requests/types";

const STAT_ITEMS = [
  {
    key: "total" as const,
    label: "Total",
    icon: Package,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    key: "pending" as const,
    label: "Pending",
    icon: Clock,
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: CheckCircle,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
];

export function RequestStats({ stats }: { stats: RequestStats }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STAT_ITEMS.map(({ key, label, icon: Icon, iconClass, bgClass }) => (
        <Card key={key} className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgClass}`}>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold tracking-tight">{stats[key]}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
