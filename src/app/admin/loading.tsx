'use client';
import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            <Spinner className="h-16 w-16 text-orange-500" />
            <div className="mt-4 text-lg text-white font-semibold">Loading Admin Panel…</div>
        </div>
    );
} 