// Responsive class utilities
export const responsiveClasses = {
    // Grid layouts
    grid: {
        mobile: 'grid-cols-1',
        tablet: 'md:grid-cols-2',
        desktop: 'lg:grid-cols-3 xl:grid-cols-4'
    },

    // Spacing
    spacing: {
        mobile: 'space-y-4',
        tablet: 'md:space-y-6',
        desktop: 'lg:space-y-8'
    },

    // Text sizes
    text: {
        h1: {
            mobile: 'text-2xl',
            tablet: 'md:text-3xl',
            desktop: 'lg:text-4xl xl:text-5xl'
        },
        h2: {
            mobile: 'text-xl',
            tablet: 'md:text-2xl',
            desktop: 'lg:text-3xl'
        },
        body: {
            mobile: 'text-sm',
            tablet: 'md:text-base',
            desktop: 'lg:text-lg'
        }
    },

    // Padding
    padding: {
        mobile: 'p-4',
        tablet: 'md:p-6',
        desktop: 'lg:p-8 xl:p-10'
    }
};

// Responsive container utilities
export const getResponsiveContainer = (size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') => {
    const containers = {
        sm: 'max-w-4xl',
        md: 'max-w-6xl',
        lg: 'max-w-7xl',
        xl: 'max-w-screen-xl'
    };

    return `container mx-auto px-4 sm:px-6 lg:px-8 ${containers[size]}`;
};

// Responsive grid utilities
export const getResponsiveGrid = (
    mobileCols: number = 1,
    tabletCols: number = 2,
    desktopCols: number = 3,
    xlCols: number = 4
) => {
    return `grid grid-cols-${mobileCols} md:grid-cols-${tabletCols} lg:grid-cols-${desktopCols} xl:grid-cols-${xlCols}`;
};

// Responsive visibility utilities
export const responsiveVisibility = {
    mobileOnly: 'block md:hidden',
    tabletOnly: 'hidden md:block lg:hidden',
    desktopOnly: 'hidden lg:block',
    mobileAndTablet: 'block lg:hidden',
    tabletAndDesktop: 'hidden md:block'
};

// Responsive layout utilities
export const responsiveLayout = {
    // Card layouts
    card: {
        mobile: 'p-4 space-y-3',
        tablet: 'md:p-6 md:space-y-4',
        desktop: 'lg:p-8 lg:space-y-6'
    },

    // Form layouts
    form: {
        mobile: 'space-y-4',
        tablet: 'md:space-y-6',
        desktop: 'lg:space-y-8'
    },

    // Navigation layouts
    nav: {
        mobile: 'flex-col space-y-2',
        tablet: 'md:flex-row md:space-y-0 md:space-x-4',
        desktop: 'lg:space-x-6'
    }
}; 