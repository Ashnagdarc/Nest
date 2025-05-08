'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onResult: (result: string) => void;
    onError?: (error: string) => void;
}

export default function QRScanner({ onResult, onError }: QRScannerProps) {
    const qrRef = useRef<Html5Qrcode | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Wait for the next frame to ensure the DOM element exists
        const timeoutId = setTimeout(() => {
            if (!elementRef.current) {
                if (onError) onError('QR scanner element not found');
                return;
            }

            try {
                // Initialize QR scanner
                qrRef.current = new Html5Qrcode('qr-reader');

                // Start scanning
                qrRef.current
                    .start(
                        { facingMode: 'environment' },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                        },
                        (decodedText) => {
                            onResult(decodedText);
                        },
                        (errorMessage) => {
                            if (onError) {
                                onError(errorMessage);
                            }
                        }
                    )
                    .catch((err) => {
                        if (onError) {
                            onError(err?.message || 'Failed to start scanner');
                        }
                    });
            } catch (err: any) {
                if (onError) {
                    onError(err?.message || 'Failed to initialize scanner');
                }
                console.error('QR scanner initialization error:', err);
            }
        }, 100); // Small delay to ensure DOM is ready

        // Cleanup
        return () => {
            clearTimeout(timeoutId);
            if (qrRef.current) {
                qrRef.current
                    .stop()
                    .catch((err) => console.error('Failed to stop scanner:', err));
            }
        };
    }, [onResult, onError]);

    return <div id="qr-reader" ref={elementRef} style={{ width: '100%', maxWidth: '600px' }} />;
} 