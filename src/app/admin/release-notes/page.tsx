import { ReleaseNotesBlastPanel } from "@/components/admin/release-notes/ReleaseNotesBlastPanel";
import { Megaphone } from "lucide-react";

export default function AdminReleaseNotesPage() {
    return (
        <div className="w-full space-y-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Release notes</h1>
                    </div>
                    <p className="text-sm text-muted-foreground sm:pl-[50px]">
                        Compose, preview, and blast platform updates to everyone — one email and in-app
                        announcement per release.
                    </p>
                </div>
            </header>
            <ReleaseNotesBlastPanel />
        </div>
    );
}
