import { useEffect, useState } from 'react';

// Breakpoint for mobile devices (768px matches md: in Tailwind)
const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the current viewport is mobile sized
 * Returns true for screens smaller than 768px (Tailwind's md breakpoint)
 */
export const useIsMobile = (): boolean => {
    // Default to true on the server or during initial client render to prevent layout shifts
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        // Function to check if window width is less than our breakpoint
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        // Check immediately
        checkIsMobile();

        // Add event listener for window resize
        window.addEventListener('resize', checkIsMobile);

        // Clean up event listener
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    return isMobile;
};

// Export a mock hook for SSR environments
export const useIsMobileSSR = () => false; 