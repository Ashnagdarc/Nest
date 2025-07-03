import { useCallback, useRef, useState } from 'react';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

/**
 * useSuccessFeedback - Custom hook for unified async feedback pattern
 *
 * Features:
 * - Shows a toast notification (success or error)
 * - Optionally triggers a success or error animation callback
 * - Optionally resets form/state
 * - Redirects to a given path after a customizable delay
 * - Exposes loading state and setter for async actions
 *
 * Usage:
 *   const { showSuccessFeedback, showErrorFeedback, loading, setLoading } = useSuccessFeedback();
 *   showSuccessFeedback({
 *     toast: { title: 'Success!', description: 'Action completed.' },
 *     redirectPath: '/user/dashboard',
 *     delay: 1500,
 *     onSuccess: () => { ... },
 *     showAnimation: () => { ... },
 *   });
 *   showErrorFeedback({
 *     toast: { title: 'Error', description: 'Something went wrong.' },
 *     redirectPath: '/user/settings',
 *     delay: 2000,
 *     onError: () => { ... },
 *     showAnimation: () => { ... },
 *   });
 */
export function useSuccessFeedback() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Success feedback
    const showSuccessFeedback = useCallback(
        ({
            toast: toastConfig,
            redirectPath,
            delay = 1500,
            onSuccess,
            showAnimation,
        }: {
            toast: { title: string; description?: string; variant?: 'default' | 'success' };
            redirectPath?: string;
            delay?: number;
            onSuccess?: () => void;
            showAnimation?: () => void;
        }) => {
            toast({
                title: toastConfig.title,
                description: toastConfig.description,
                variant: toastConfig.variant || 'success',
            });
            if (showAnimation) showAnimation();
            if (onSuccess) onSuccess();
            if (redirectPath) {
                timeoutRef.current = setTimeout(() => {
                    router.push(redirectPath);
                }, delay);
            }
        },
        [router, toast]
    );

    // Error feedback
    const showErrorFeedback = useCallback(
        ({
            toast: toastConfig,
            redirectPath,
            delay = 2000,
            onError,
            showAnimation,
        }: {
            toast: { title: string; description?: string; variant?: 'default' | 'destructive' };
            redirectPath?: string;
            delay?: number;
            onError?: () => void;
            showAnimation?: () => void;
        }) => {
            toast({
                title: toastConfig.title,
                description: toastConfig.description,
                variant: toastConfig.variant || 'destructive',
            });
            if (showAnimation) showAnimation();
            if (onError) onError();
            if (redirectPath) {
                timeoutRef.current = setTimeout(() => {
                    router.push(redirectPath);
                }, delay);
            }
        },
        [router, toast]
    );

    // Cleanup timeout on unmount
    // (Optional: add useEffect(() => ...), omitted for brevity)

    return {
        showSuccessFeedback,
        showErrorFeedback,
        loading,
        setLoading,
    };
} 