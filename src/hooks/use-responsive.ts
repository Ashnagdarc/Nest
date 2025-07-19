import { useEffect, useState } from 'react';

// Comprehensive breakpoint system matching Tailwind
export const BREAKPOINTS = {
    xs: 480,    // Extra small devices
    sm: 640,    // Small devices
    md: 768,    // Medium devices
    lg: 1024,   // Large devices
    xl: 1280,   // Extra large devices
    '2xl': 1536 // 2X large devices
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Enhanced responsive hook with multiple breakpoint support
export const useResponsive = () => {
    const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xs');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        const updateBreakpoint = () => {
            const width = window.innerWidth;

            if (width >= BREAKPOINTS['2xl']) setCurrentBreakpoint('2xl');
            else if (width >= BREAKPOINTS.xl) setCurrentBreakpoint('xl');
            else if (width >= BREAKPOINTS.lg) setCurrentBreakpoint('lg');
            else if (width >= BREAKPOINTS.md) setCurrentBreakpoint('md');
            else if (width >= BREAKPOINTS.sm) setCurrentBreakpoint('sm');
            else setCurrentBreakpoint('xs');
        };

        updateBreakpoint();
        window.addEventListener('resize', updateBreakpoint);

        return () => window.removeEventListener('resize', updateBreakpoint);
    }, []);

    return {
        breakpoint: currentBreakpoint,
        isXs: currentBreakpoint === 'xs',
        isSm: currentBreakpoint === 'sm',
        isMd: currentBreakpoint === 'md',
        isLg: currentBreakpoint === 'lg',
        isXl: currentBreakpoint === 'xl',
        is2Xl: currentBreakpoint === '2xl',
        isMobile: currentBreakpoint === 'xs' || currentBreakpoint === 'sm',
        isTablet: currentBreakpoint === 'md',
        isDesktop: currentBreakpoint === 'lg' || currentBreakpoint === 'xl' || currentBreakpoint === '2xl',
        isClient
    };
};

// Specific breakpoint hooks for common use cases
export const useIsMobile = () => {
    const { isMobile } = useResponsive();
    return isMobile;
};

export const useIsTablet = () => {
    const { isTablet } = useResponsive();
    return isTablet;
};

export const useIsDesktop = () => {
    const { isDesktop } = useResponsive();
    return isDesktop;
};

// Hook for responsive values
export const useResponsiveValue = <T>(
    mobile: T,
    tablet: T,
    desktop: T
): T => {
    const { isMobile, isTablet } = useResponsive();

    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
};

// Hook for responsive array values
export const useResponsiveArray = <T>(values: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
}): T | undefined => {
    const { breakpoint } = useResponsive();
    return values[breakpoint];
}; 