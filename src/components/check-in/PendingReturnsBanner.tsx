import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PendingReturnsBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Alert className="border-amber-500/30 bg-amber-500/5">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        {count} return{count !== 1 ? "s" : ""} awaiting approval
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200/90">
        These items are hidden from the list below until an admin approves or rejects them.
      </AlertDescription>
    </Alert>
  );
}
