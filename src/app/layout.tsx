// Root layout for Nest by Eden Oasis. Sets up global providers, metadata, fonts, and theme management.

import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { UserProfileProvider } from "@/components/providers/user-profile-provider";
import { SupabaseErrorBoundary } from "@/components/supabase-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { Favicon } from "@/components/ui/theme-favicon";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SessionRecoveryInitializer } from "@/components/SessionRecoveryInitializer";

// Patch console.error for Supabase real-time polling fallback
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = function (...args) {
    const isChannelError = args.some(arg => {
      const str = typeof arg === 'string' ? arg :
        (arg instanceof Error ? arg.message : String(arg));
      return str.includes('CHANNEL_ERROR') ||
        str.includes('gear_maintenance') ||
        str.includes('_onConnClose') ||
        str.includes('RealtimeClient');
    });
    if (isChannelError) {
      originalWarn(' Supabase real-time using polling fallback (normal in development)');
      return;
    }
    originalError.apply(console, args);
  };
}

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: 'swap',
  variable: '--font-lato'
});

export const metadata: Metadata = {
  title: {
    default: "Nest",
    template: "%s | Nest"
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
    title: "Nest - Asset Management System",
    description: "Streamline your organization's asset management with our comprehensive tracking and request system.",
    siteName: "Nest",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nest - Asset Management System"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Nest - Asset Management System",
    description: "Comprehensive asset tracking and management solution for modern organizations.",
    images: ["/images/twitter-image.png"],
    creator: "@edenoasis"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/Favicon.png?v=5", sizes: "64x64", type: "image/png" }
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

interface RootLayoutProps {
  children: React.ReactNode;
}

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
        <meta name="apple-mobile-web-app-title" content="Nest" />
        {/* Prevent zoom on input focus for iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${lato.variable} font-sans antialiased`}>
        <SessionRecoveryInitializer />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Favicon />
          <UserProfileProvider>
            <NotificationProvider>
              <SupabaseErrorBoundary>
                {children}
                <Toaster />
              </SupabaseErrorBoundary>
            </NotificationProvider>
          </UserProfileProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
