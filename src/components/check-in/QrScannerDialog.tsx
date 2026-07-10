"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SCANNER_ID = "check-in-qr-scanner";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

export function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore teardown errors
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setError(null);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setStarting(true);
      setError(null);
      await stopScanner();

      try {
        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            onScan(decoded);
            onOpenChange(false);
          },
          () => {
            // scan attempt — ignore
          },
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not access camera");
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    const timer = setTimeout(() => void start(), 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      void stopScanner();
    };
  }, [open, onScan, onOpenChange, stopScanner]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan equipment QR
          </DialogTitle>
          <DialogDescription>
            Point your camera at the gear QR code or barcode to select it for return.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl bg-black">
          <div id={SCANNER_ID} className="min-h-[240px] w-full" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
              Starting camera…
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="button" variant="outline" className="gap-2" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
