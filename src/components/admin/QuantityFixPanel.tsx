'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuantityValidationResult {
    valid: number;
    invalid: number;
    issues: Array<{
        gearId: string;
        name: string;
        issue: string;
        currentState: any;
    }>;
}

interface FixResult {
    success: boolean;
    fixed: number;
    errors: string[];
}

export default function QuantityFixPanel() {
    const [isValidating, setIsValidating] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [validationResult, setValidationResult] = useState<QuantityValidationResult | null>(null);
    const [fixResult, setFixResult] = useState<FixResult | null>(null);
    const { toast } = useToast();

    const validateQuantities = async () => {
        setIsValidating(true);
        setValidationResult(null);

        try {
            const response = await fetch('/api/admin/fix-gear-quantities', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                setValidationResult(result);
                toast({
                    title: 'Validation Complete',
                    description: `Found ${result.valid} valid and ${result.invalid} invalid gear entries.`,
                });
            } else {
                throw new Error(result.error || 'Validation failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Validation failed';
            toast({
                title: 'Validation Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsValidating(false);
        }
    };

    const fixQuantities = async () => {
        setIsFixing(true);
        setFixResult(null);

        try {
            const response = await fetch('/api/admin/fix-gear-quantities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'fix' }),
            });

            const result = await response.json();

            if (result.success) {
                setFixResult(result);
                toast({
                    title: 'Fix Complete',
                    description: `Successfully fixed ${result.fixed} gear entries.`,
                });

                // Refresh validation results
                await validateQuantities();
            } else {
                throw new Error(result.error || 'Fix failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Fix failed';
            toast({
                title: 'Fix Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Gear Quantity Fix Panel
                </CardTitle>
                <CardDescription>
                    Emergency tools to fix gear quantity inconsistencies in the database.
                    Use this when gears show incorrect available_quantity values.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={validateQuantities}
                        disabled={isValidating}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        {isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle className="h-4 w-4" />
                        )}
                        {isValidating ? 'Validating...' : 'Validate Quantities'}
                    </Button>

                    <Button
                        onClick={fixQuantities}
                        disabled={isFixing || !validationResult}
                        variant="destructive"
                        className="flex items-center gap-2"
                    >
                        {isFixing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <AlertTriangle className="h-4 w-4" />
                        )}
                        {isFixing ? 'Fixing...' : 'Fix Quantities'}
                    </Button>
                </div>

                {/* Validation Results */}
                {validationResult && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <Badge variant={validationResult.invalid === 0 ? 'default' : 'destructive'}>
                                {validationResult.valid} Valid
                            </Badge>
                            <Badge variant={validationResult.invalid === 0 ? 'default' : 'destructive'}>
                                {validationResult.invalid} Invalid
                            </Badge>
                        </div>

                        {validationResult.invalid > 0 && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Found {validationResult.invalid} gear entries with quantity inconsistencies.
                                    Click "Fix Quantities" to resolve these issues.
                                </AlertDescription>
                            </Alert>
                        )}

                        {validationResult.valid > 0 && validationResult.invalid === 0 && (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    All gear quantities are consistent! No fixes needed.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Issue Details */}
                        {validationResult.issues.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Issues Found:</h4>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {validationResult.issues.map((issue, index) => (
                                        <div key={index} className="p-3 border rounded-lg bg-muted/50">
                                            <div className="font-medium text-sm">{issue.name}</div>
                                            <div className="text-xs text-muted-foreground">{issue.issue}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Status: {issue.currentState.status},
                                                Quantity: {issue.currentState.quantity},
                                                Available: {issue.currentState.available_quantity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Fix Results */}
                {fixResult && (
                    <div className="space-y-3">
                        <Alert variant={fixResult.success ? 'default' : 'destructive'}>
                            {fixResult.success ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                            <AlertDescription>
                                {fixResult.success
                                    ? `Successfully fixed ${fixResult.fixed} gear entries.`
                                    : 'Fix operation failed.'
                                }
                            </AlertDescription>
                        </Alert>

                        {fixResult.errors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm text-destructive">Errors Encountered:</h4>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {fixResult.errors.map((error, index) => (
                                        <div key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                            {error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>How to use:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Click "Validate Quantities" to check the current database state</li>
                        <li>Review any issues found</li>
                        <li>Click "Fix Quantities" to automatically resolve inconsistencies</li>
                        <li>Re-validate to confirm the fix worked</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
    );
}
