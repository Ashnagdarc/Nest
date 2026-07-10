"use client";

import { useMemo, useState } from "react";
import { Search, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PickableUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: string;
};

interface UserPickerProps {
  users: PickableUser[];
  excludeIds?: string[];
  mode: "single" | "multi";
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

function userInitials(user: PickableUser) {
  return (user.full_name || user.email || "?").charAt(0).toUpperCase();
}

function UserAvatar({ user, size = "md" }: { user: PickableUser; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
      )}
    >
      {userInitials(user)}
    </div>
  );
}

export function UserPicker({
  users,
  excludeIds = [],
  mode,
  value,
  onChange,
  placeholder = "Search by name or email...",
  emptyMessage = "No users found",
  className,
}: UserPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedIds = useMemo(
    () => (mode === "single" ? (value ? [value as string] : []) : (value as string[])),
    [mode, value],
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return users
      .filter((user) => !excludeIds.includes(user.id))
      .filter((user) => !selectedIds.includes(user.id))
      .filter((user) => {
        if (!term) return true;
        return (
          user.full_name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term)
        );
      });
  }, [users, excludeIds, selectedIds, searchTerm]);

  const selectedUsers = useMemo(
    () => selectedIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as PickableUser[],
    [selectedIds, users],
  );

  const handleSelect = (userId: string) => {
    if (mode === "single") {
      onChange(userId);
      setSearchTerm("");
      return;
    }
    onChange([...selectedIds, userId]);
  };

  const handleRemove = (userId: string) => {
    if (mode === "single") {
      onChange("");
      return;
    }
    onChange(selectedIds.filter((id) => id !== userId));
  };

  if (mode === "single" && selectedUsers.length === 1) {
    const selected = selectedUsers[0];
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3",
          className,
        )}
      >
        <UserAvatar user={selected} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {selected.full_name || "Unknown"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
        </div>
        <button
          type="button"
          onClick={() => handleRemove(selected.id)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          aria-label="Remove selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {mode === "multi" && selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2"
            >
              <UserAvatar user={user} size="sm" />
              <span className="max-w-[140px] truncate text-xs font-medium">
                {user.full_name || user.email}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(user.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${user.full_name || user.email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative border-b border-border">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-52 divide-y divide-border overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
              >
                <UserAvatar user={user} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.full_name || "Unknown"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                {user.role && (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {user.role}
                  </span>
                )}
                {mode === "multi" && (
                  <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
