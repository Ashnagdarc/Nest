"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { testLogger } from "@/lib/logger";

export default function LoggerDebugPage() {
    const handleTestLogger = () => {
        testLogger();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Logger Debug Page</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">
                        This page tests the logger improvements to ensure empty objects and null values are not logged.
                    </p>
                    <Button onClick={handleTestLogger}>
                        Test Logger Improvements
                    </Button>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Check the browser console to see the test results.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
