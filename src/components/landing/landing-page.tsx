"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useEffect, useState } from 'react';
// Removed Supabase client import
// import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { AlertCircle } from 'lucide-react'; // Import Icon

// Placeholder for Firebase status check (as Firebase was removed)
const firebaseInitialized = false; // Assume false since Firebase is removed
const firebaseInitError = "Firebase configuration has been removed. Using Supabase."; // Placeholder error

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  // const supabase = createClient(); // Keep if needed for fetching settings from Supabase

  useEffect(() => {
    // Show a warning if Firebase config is still expected but missing
    if (!firebaseInitialized && firebaseInitError) {
      // If you intend to use ONLY Supabase, this check might be irrelevant.
      // If you want to support either, you need logic to check which one is configured.
      // For now, we assume Supabase is the intended backend.
      console.warn("LandingPage: Firebase checks are present but Firebase is not configured.");
      setConfigError(null); // Clear Firebase error as Supabase is intended
    }


    // Fetch logo from Supabase app_settings if needed
    const fetchLogo = async () => {
      setIsLoadingLogo(true);
      // Replace this with your Supabase fetching logic if the logo URL is stored there
      // Example placeholder:
      try {
        // const { data, error } = await supabase
        //     .from('app_settings')
        //     .select('value')
        //     .eq('key', 'logoUrl')
        //     .single();
        // if (error) throw error;
        // setLogoUrl(data?.value || null);
        setLogoUrl(null); // Set to null for now as fetch logic needs Supabase client
        console.warn("LandingPage: Logo fetching logic needs to be implemented using Supabase client.");

      } catch (fetchError) {
        console.error("Error fetching Supabase settings for logo:", fetchError);
        setConfigError("Could not fetch application settings.");
        setLogoUrl(null);
      } finally {
        setIsLoadingLogo(false);
      }
    };

    fetchLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependency array might need adjustment based on Supabase client stability

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="items-center text-center">
            {isLoadingLogo && !configError ? (
              <div className="mb-4 h-[80px] w-[80px] rounded-full bg-muted animate-pulse"></div>
            ) : logoUrl ? (
              <Image
                key={logoUrl}
                src={logoUrl}
                alt="GearFlow Logo"
                width={80}
                height={80}
                className="mb-4 rounded-full border object-contain"
                data-ai-hint="gear logo"
                unoptimized
              />
            ) : !configError ? (
              <div className="mb-4 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-muted text-muted-foreground">
                <span className="text-xs">GearFlow</span>
              </div>
            ) : null}
            <CardTitle className="text-3xl font-bold text-primary">
              GearFlow
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Streamline Gear Management for Eden Oasis Realty
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {configError ? ( // Display error if Supabase fetch failed
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                  {configError} Ensure Supabase URL/Key are set and RLS allows reading settings.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-center text-secondary-foreground">
                  Efficiently track, request, and manage company equipment.
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex w-full flex-col space-y-3 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0"
                >
                  <Link href="/login">
                    <Button className="w-full sm:w-auto" size="lg">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" passHref legacyBehavior>
                    <Button variant="outline" className="w-full sm:w-auto" size="lg">
                      Sign Up
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <footer className="mt-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Eden Oasis Realty. All rights reserved.
      </footer>
    </div>
  );
}
