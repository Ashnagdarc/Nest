"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Menu, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FlipWordsHero from "./FlipWordsHero";
import { ThemeLogo } from "@/components/ui/theme-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
    const [configError, setConfigError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLogoUrl] = useState('/Nest-logo.png');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // Use default logo path as fallback
        const defaultLogoPath = '/Nest-logo.png';

        // Check if supabase client is initialized
        if (!supabase) {
          setLogoUrl(defaultLogoPath);
          return;
        }

        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'logoUrl')
          .single();

        if (error) {
          console.warn("Supabase query error:", error.message);
          setLogoUrl(defaultLogoPath);
          return;
        }

        // If no data found, use default logo
        if (!data || !data.value) {
          setLogoUrl(defaultLogoPath);
          return;
        }

        // Validate the URL
        try {
          new URL(data.value);
          setLogoUrl(data.value);
        } catch {
          // If URL is invalid, assume it's a local path
          setLogoUrl(data.value.startsWith('/') ? data.value : `/${data.value}`);
        }

        setConfigError(null);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error fetching Supabase settings for logo:", error.message);
          // Always fallback to local logo
          setLogoUrl('/Nest-logo.png');
        }
      }
    };

    fetchLogo();
  }, [supabase]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Modern Clean Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <ThemeLogo
                width={80}
                height={80}
                className="w-14 h-14 sm:w-18 sm:h-18 rounded-lg object-contain"
              />

            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/90 transition-all duration-200 hover:bg-muted hover:text-foreground sm:px-4 lg:text-base"
              >
                Sign in
              </Link>
              <ThemeToggle />
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-6 lg:text-base"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="rounded-lg p-2 text-foreground/90 transition-colors hover:bg-muted hover:text-foreground md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-14 border-b border-border bg-background/95 backdrop-blur-xl sm:top-16 md:hidden"
          >
            <div className="space-y-3 px-4 py-4">
              <div className="flex justify-end">
                <ThemeToggle />
              </div>
              <Link
                href="/login"
                className="block w-full rounded-lg px-4 py-3 text-center text-sm text-foreground transition-colors hover:bg-muted sm:text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="block w-full rounded-lg bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Content */}
      <div className="relative z-10 w-full pt-14 sm:pt-16">
        {/* Hero Section */}
        <FlipWordsHero />
      </div>

      {/* Error Alert */}
      {configError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 max-w-[calc(100vw-2rem)] sm:max-w-md mx-4 sm:mx-0 z-50"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription className="text-sm">{configError}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
}
