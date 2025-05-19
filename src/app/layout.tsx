import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { ReactQueryProvider } from '@/components/providers/react-query-provider'; // Import ReactQueryProvider
import { ThemeProvider } from 'next-themes';
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { SupabaseErrorBoundary } from "@/components/supabase-error-boundary";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
// Import the console error interceptor to filter Supabase Realtime noise
import '@/utils/intercept-console-error';

const inter = Inter({ subsets: ['latin'] });

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'; // Adjust port if necessary

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'GearFlow - Equipment Management',
  description: 'Streamline Gear Management for Eden Oasis Realty',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GearFlow',
  },
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NotificationProvider>
            <ReactQueryProvider>
              <SupabaseErrorBoundary>
                {children}
              </SupabaseErrorBoundary>
              <Toaster />
              <SpeedInsights />
            </ReactQueryProvider>
          </NotificationProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
