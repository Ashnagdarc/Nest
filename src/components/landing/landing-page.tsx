"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Package, Clock, BarChart, Users, ChevronDown, Menu, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FlipWordsHero from "./FlipWordsHero";

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const navItems = [
    { name: "Features", link: "#features" },
    { name: "Pricing", link: "#pricing" },
    { name: "Contact", link: "#contact" },
  ];

  useEffect(() => {
    setIsMounted(true);
    const fetchLogo = async () => {
      setIsLoadingLogo(true);
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
      } catch (error: any) {
        console.error("Error fetching Supabase settings for logo:", error.message);
        // Always fallback to local logo
        setLogoUrl('/Nest-logo.png');
      } finally {
        setIsLoadingLogo(false);
      }
    };

    fetchLogo();
  }, [supabase]);

  const features = [
    {
      icon: <Package className="w-8 h-8" />,
      title: "Track Equipment",
      description: "Keep detailed records of all company gear"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Request & Schedule",
      description: "Book gear when you need it"
    },
    {
      icon: <BarChart className="w-8 h-8" />,
      title: "Analytics",
      description: "Track usage patterns and status"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Management",
      description: "Coordinate equipment use"
    }
  ];

  if (!isMounted) {
    return null; // Prevent hydration issues by not rendering until client-side
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">
      {/* Modern Clean Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 bg-black/80 backdrop-blur-xl border-b border-white/10">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <img
                src={logoUrl || "/Nest-logo.png"}
                alt="Nest Logo"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  Nest
                </span>
                <span className="text-xs font-medium text-neutral-400 hidden sm:block">
                  by Eden Oasis
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/login"
                className="text-sm font-medium text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
            className="md:hidden absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              <Link
                href="/login"
                className="block w-full text-center text-white/90 hover:text-white px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="block w-full text-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Content */}
      <div className="relative z-10 w-full">
        {/* Hero Section */}
        <FlipWordsHero />

        {/* Features Grid removed as requested */}
      </div>

      {/* Error Alert */}
      {configError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 max-w-[calc(100vw-2rem)] sm:max-w-md mx-4 sm:mx-0"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
}
