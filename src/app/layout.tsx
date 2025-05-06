import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { ReactQueryProvider } from '@/components/providers/react-query-provider'; // Import ReactQueryProvider
import { ThemeProvider } from 'next-themes';
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

const inter = Inter({ subsets: ['latin'] });

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'; // Adjust port if necessary

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'GearFlow - Equipment Management', // Updated Title
  description: 'Streamline Gear Management for Eden Oasis Realty', // Updated Description
};

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
              {children}
              <Toaster />
            </ReactQueryProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
