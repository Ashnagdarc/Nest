/**
 * Root Layout Component - Nest by Eden Oasis
 * 
 * This is the main layout component that wraps the entire application. It provides
 * essential setup including global providers, metadata configuration, font loading,
 * and theme management. This layout applies to all pages in the application.
 * 
 * Key Responsibilities:
 * - Global HTML structure and metadata
 * - Provider setup (Theme, Supabase, Query Client)
 * - Font loading and CSS imports
 * - Toast notification system
 * - Analytics and performance monitoring
 * 
 * Architecture:
 * - Server Component for optimal performance
 * - Progressive Web App (PWA) support
 * - Responsive design foundation
 * - Accessibility-first approach
 * 
 * @fileoverview Root layout with providers and global configuration
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from 'next-themes';
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { SupabaseErrorBoundary } from "@/components/supabase-error-boundary";
import { UserProfileProvider } from '@/components/providers/user-profile-provider';
// Import the console error interceptor to filter Supabase Realtime noise
import '@/utils/intercept-console-error';

/**
 * Lato Font Configuration
 * 
 * Loads the Lato font family optimized for web performance with:
 * - Multiple weights for design flexibility
 * - Latin character subset for reduced bundle size
 * - Display swap for improved perceived performance
 * - Friendly and approachable typography
 * 
 * @constant {NextFont} lato - Configured Lato font instance
 */
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: 'swap',
  variable: '--font-lato'
});

/**
 * Application Metadata Configuration
 * 
 * Comprehensive metadata setup for SEO, social sharing, and PWA functionality.
 * Includes Open Graph tags, Twitter cards, and mobile optimization.
 * 
 * SEO Features:
 * - Descriptive title and meta description
 * - Open Graph tags for social media sharing
 * - Twitter card configuration
 * - Canonical URL and site verification
 * 
 * PWA Features:
 * - Web app manifest reference
 * - Mobile-optimized viewport
 * - App icons and theme colors
 * 
 * @constant {Metadata} metadata - Application metadata configuration
 */
export const metadata: Metadata = {
  title: {
    default: "Nest by Eden Oasis",
    template: "%s | Nest by Eden Oasis"
  },
  description: "Comprehensive Asset Management System - Track, request, and manage all types of assets including equipment, vehicles, technology, and office supplies.",
  keywords: [
    "asset management",
    "equipment tracking",
    "inventory management",
    "request system",
    "Eden Oasis",
    "asset tracking"
  ],
  authors: [{ name: "Daniel Chinonso Samuel" }],
  creator: "Eden Oasis",
  publisher: "Eden Oasis",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nest-eden-oasis.vercel.app'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Nest by Eden Oasis - Asset Management System",
    description: "Streamline your organization's asset management with our comprehensive tracking and request system.",
    siteName: "Nest by Eden Oasis",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nest by Eden Oasis - Asset Management System"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Nest by Eden Oasis - Asset Management System",
    description: "Comprehensive asset tracking and management solution for modern organizations.",
    images: ["/images/twitter-image.png"],
    creator: "@edenoasis"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" }
    ],
    other: [
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#ff6300" }
    ]
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  }
};

/**
 * Viewport Configuration
 * 
 * Optimizes the viewport for responsive design and mobile performance.
 * Includes PWA theme colors and prevents unwanted zoom behavior.
 * 
 * Mobile Optimization:
 * - Responsive width scaling
 * - Initial scale for proper rendering
 * - Theme color for browser UI
 * - Status bar styling for mobile web apps
 * 
 * @constant {Viewport} viewport - Viewport configuration object
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' }
  ],
  colorScheme: 'dark light'
};

/**
 * Root Layout Interface
 * 
 * Defines the props structure for the root layout component.
 * Uses React.ReactNode for maximum flexibility with child components.
 */
interface RootLayoutProps {
  /** Child components to render within the layout */
  children: React.ReactNode;
}

/**
 * Root Layout Component
 * 
 * The main layout wrapper that provides global context and structure for the
 * entire application. This component sets up essential providers, styling,
 * and monitoring tools that are used throughout the app.
 * 
 * Provider Hierarchy:
 * 1. ThemeProvider - Manages light/dark theme switching
 * 2. Supabase Context - Handled within individual components
 * 3. React Query - Handled within specific data-fetching components
 * 
 * Global Features:
 * - Theme switching (light/dark mode)
 * - Toast notifications for user feedback
 * - Analytics tracking for insights
 * - Performance monitoring
 * - Consistent typography and spacing
 * 
 * @component
 * @param {RootLayoutProps} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {JSX.Element} The complete HTML document structure
 * 
 * @example
 * ```tsx
 * // This layout automatically wraps all pages
 * export default function Page() {
 *   return <div>Page content here</div>;
 * }
 * // Result: Full layout with providers + page content
 * ```
 */
export default function RootLayout({
  children,
}: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* PWA iOS meta tags for better mobile experience */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nest by Eden Oasis" />

        {/* Prevent zoom on input focus for iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${lato.className} min-h-screen bg-background font-sans antialiased`}>
        {/**
         * Theme Provider Setup
         * 
         * Provides theme context to all child components with:
         * - Automatic system theme detection
         * - Manual theme switching capability
         * - Persistent theme preference storage
         * - Smooth theme transitions
         */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {/**
           * Main Application Content
           * 
           * All pages and components are rendered within this provider context,
           * ensuring they have access to theme state and other global features.
           */}
          <NotificationProvider>
            <SupabaseErrorBoundary>
              <UserProfileProvider>
                <div className="container mx-auto px-4 min-h-screen flex flex-col">
                  {children}
                </div>
              </UserProfileProvider>
            </SupabaseErrorBoundary>
            <Toaster />
          </NotificationProvider>
        </ThemeProvider>

        {/**
         * Analytics and Performance Monitoring
         * 
         * These components provide insights into application usage and performance:
         * 
         * Analytics: Tracks user interactions, page views, and custom events
         * to help understand how the application is being used and identify
         * areas for improvement.
         * 
         * SpeedInsights: Monitors Core Web Vitals and performance metrics
         * to ensure the application meets performance standards and provides
         * a good user experience.
         * 
         * Both services are provided by Vercel and integrate seamlessly with
         * the deployment platform.
         */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
