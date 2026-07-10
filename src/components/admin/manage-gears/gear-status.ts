export function getGearStatusClass(status: string | null | undefined): string {
    switch (status) {
        case "Available":
            return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
        case "Partially Available":
            return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
        case "Booked":
        case "Checked Out":
        case "Partially Checked Out":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
        case "Damaged":
            return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
        case "Under Repair":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200";
        case "New":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200";
        default:
            return "bg-muted text-muted-foreground";
    }
}
