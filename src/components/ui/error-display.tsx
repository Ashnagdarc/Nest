import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Alert, AlertDescription, AlertTitle } from "./alert";

interface ErrorDisplayProps {
    error: string;
    onRetry?: () => void;
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
    return (
        <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                <p className="mb-2">{error}</p>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        Try Again
                    </Button>
                )}
            </AlertDescription>
        </Alert>
    );
} 