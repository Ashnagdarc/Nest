import Link from "next/link";
import { PackageCheck, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckInHeaderProps {
  onScanClick: () => void;
}

export function CheckInHeader({ onScanClick }: CheckInHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PackageCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Check-in gear</h1>
        </div>
        <p className="text-sm text-muted-foreground sm:pl-[52px]">
          Return equipment you have checked out. Returns need admin approval.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 self-start">
        <Button type="button" variant="outline" className="gap-2" onClick={onScanClick}>
          <QrCode className="h-4 w-4" />
          Scan QR
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/user/history">Full history</Link>
        </Button>
      </div>
    </header>
  );
}
