'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onResult: (result: string) => void;
    onError?: (error: string) => void;
}

export default function QRScanner({ onResult, onError }: QRScannerProps) {
    const qrRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
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

        // Cleanup
        return () => {
            if (qrRef.current) {
                qrRef.current
                    .stop()
                    .catch((err) => console.error('Failed to stop scanner:', err));
            }
        };
    }, [onResult, onError]);

    return <div id="qr-reader" style={{ width: '100%', maxWidth: '600px' }} />;
} 