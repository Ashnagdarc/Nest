import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "checked out", label: "Checked out" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Completed" },
] as const;

interface RequestFiltersProps {
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function RequestFilters({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: RequestFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search gear, destination, or reason…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 pl-10"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
