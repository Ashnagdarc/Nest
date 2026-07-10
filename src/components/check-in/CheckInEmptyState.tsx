import Link from "next/link";
import { History, PackageCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckInEmptyStateProps {
  pendingCount: number;
}

export function CheckInEmptyState({ pendingCount }: CheckInEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <PackageCheck className="mb-4 h-12 w-12 text-muted-foreground/40" />
      <h2 className="text-xl font-semibold">Nothing to return right now</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {pendingCount > 0
          ? `You have ${pendingCount} return${pendingCount !== 1 ? "s" : ""} waiting for admin approval. Approved gear will appear here when you have more to check in.`
          : "You don't have any checked-out equipment due for return. Request gear from browse when you need it."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="gap-2">
          <Link href="/user/browse">
            <Search className="h-4 w-4" />
            Browse equipment
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/user/my-requests">My requests</Link>
        </Button>
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/user/history">
            <History className="h-4 w-4" />
            History
          </Link>
        </Button>
      </div>
    </div>
  );
}
