import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                <h1 className="text-4xl font-bold mb-4">You're Offline</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Please check your internet connection and try again.
                </p>
                <Button
                    onClick={() => window.location.reload()}
                    className="bg-primary hover:bg-primary/90"
                >
                    Try Again
                </Button>
            </div>
        </div>
    )
} 