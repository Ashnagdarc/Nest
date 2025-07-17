import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Loading fallback component
const LoadingFallback = () => (
    <div className="space-y-4" >
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
    </div>
);

// Dashboard fallback with specific layout
const DashboardLoadingFallback = () => (
    <div className="space-y-6" >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" >
            {
                [...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))
            }
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
        </div>
    </div>
);

// Table loading fallback
const TableLoadingFallback = () => (
    <div className="space-y-3" >
        <Skeleton className="h-10 w-full" />
        {
            [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
            ))
        }
    </div>
);

/**
 * Lazy-loaded components for better performance
 */

// Dashboard Components
export const LazyDashboardStats = dynamic(
    () => import('@/components/admin/DashboardStats').then(m => m.default),
    {
        loading: () => <DashboardLoadingFallback />,
        ssr: false,
    }
);

export const LazyRequestStats = dynamic(
    () => import('@/components/admin/RequestStats').then(m => m.default),
    {
        loading: () => <DashboardLoadingFallback />,
        ssr: false,
    }
);

export const LazyActivitiesSection = dynamic(
    () => import('@/components/admin/ActivitiesSection').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

export const LazyUtilizationSection = dynamic(
    () => import('@/components/admin/UtilizationSection').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

// Management Components (Heavy tables)
export const LazyRequestsManagement = dynamic<{ default: ComponentType }>(
    () => import('@/components/admin/RequestsManagement').then(m => m.default),
    {
        loading: () => <TableLoadingFallback />,
        ssr: false,
    }
);

export const LazyInventoryManagement = dynamic<{ default: ComponentType }>(
    () => import('@/components/admin/InventoryManagement').then(m => m.default),
    {
        loading: () => <TableLoadingFallback />,
        ssr: false,
    }
);

export const LazyUsersManagement = dynamic<{ default: ComponentType }>(
    () => import('@/components/admin/UsersManagement').then(m => m.default),
    {
        loading: () => <TableLoadingFallback />,
        ssr: false,
    }
);

// Reports Components (Heavy data processing)
export const LazyWeeklyActivityReport = dynamic(
    () => import('@/components/reports/WeeklyActivityReport').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

// User Components
export const LazyPopularGearWidget = dynamic(
    () => import('@/components/dashboard/PopularGearWidget').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: true,
    }
);

export const LazyRecentActivity = dynamic(
    () => import('@/components/dashboard/RecentActivity').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: true,
    }
);

export const LazyUpcomingEvents = dynamic(
    () => import('@/components/dashboard/UpcomingEvents').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: true,
    }
);

// Modals (Only load when needed)
export const LazyViewRequestModal = dynamic(
    () => import('@/components/admin/ViewRequestModal').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

export const LazyEditItemModal = dynamic(
    () => import('@/components/admin/EditItemModal').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

export const LazyAnnouncementPopup = dynamic(
    () => import('@/components/AnnouncementPopup').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

// QR Scanner (Heavy external dependency)
export const LazyQRScanner = dynamic(
    () => import('@/components/qr-scanner').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

// Image Cropper (Heavy external dependency)
export const LazyImageCropper = dynamic(
    () => import('@/components/ui/ImageCropperModal').then(m => m.default),
    {
        loading: () => <LoadingFallback />,
        ssr: false,
    }
);

/**
 * Utility function to create custom lazy components
 */
export const createLazyComponent = <P extends object>(
    importFunction: () => Promise<{ default: ComponentType<P> }>,
    options?: {
        fallback?: ComponentType;
        ssr?: boolean;
    }
) => {
    return dynamic(importFunction, {
        loading: options?.fallback || LoadingFallback,
        ssr: options?.ssr ?? true,
    });
};

/**
 * Preload function for critical components
 */
export const preloadComponents = {
    dashboard: () => {
        import('@/components/admin/DashboardStats');
        import('@/components/admin/RequestStats');
    },

    userDashboard: () => {
        import('@/components/dashboard/PopularGearWidget');
        import('@/components/dashboard/RecentActivity');
        import('@/components/dashboard/UpcomingEvents');
    },

    management: () => {
        import('@/components/admin/RequestsManagement');
        import('@/components/admin/InventoryManagement');
        import('@/components/admin/UsersManagement');
    },

    reports: () => {
        import('@/components/reports/WeeklyActivityReport');
    }
};

export default {
    // Dashboard
    DashboardStats: LazyDashboardStats,
    RequestStats: LazyRequestStats,
    ActivitiesSection: LazyActivitiesSection,
    UtilizationSection: LazyUtilizationSection,

    // Management
    RequestsManagement: LazyRequestsManagement,
    InventoryManagement: LazyInventoryManagement,
    UsersManagement: LazyUsersManagement,

    // Reports
    WeeklyActivityReport: LazyWeeklyActivityReport,

    // User Components
    PopularGearWidget: LazyPopularGearWidget,
    RecentActivity: LazyRecentActivity,
    UpcomingEvents: LazyUpcomingEvents,

    // Modals
    ViewRequestModal: LazyViewRequestModal,
    EditItemModal: LazyEditItemModal,
    AnnouncementPopup: LazyAnnouncementPopup,

    // Heavy External Dependencies
    QRScanner: LazyQRScanner,
    ImageCropper: LazyImageCropper,

    // Utilities
    create: createLazyComponent,
    preload: preloadComponents,
}; 