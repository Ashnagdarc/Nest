"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Package, Clock, BarChart, Users, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FlipWordsHero from "./FlipWordsHero";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  const navItems = [
    { name: "Features", link: "#features" },
    { name: "Pricing", link: "#pricing" },
    { name: "Contact", link: "#contact" },
  ];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchLogo = async () => {
      setIsLoadingLogo(true);
      try {
        // Use default logo path as fallback
        const defaultLogoPath = '/Gearflow logo.png';

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
        setLogoUrl('/Gearflow logo.png');
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
      {/* Background gradient overlay}

      {/* Aceternity UI Navbar */}
      <Navbar>
        <NavBody className="bg-transparent dark:bg-transparent shadow-none border-none">
          {/* Custom Logo for Flow Tag */}
          <a href="#" className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-white">
            <img
              src={logoUrl || "/Gearflow logo.png"}
              alt="Flow Tag Logo"
              width={30}
              height={30}
              className="rounded-lg object-contain"
            />
            <span className="font-bold text-xl bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Flow Tag</span>
            <span className="text-xs font-medium text-neutral-300 ml-1">by Eden Oasis</span>
          </a>
          <div className="flex items-center gap-4">
            <NavbarButton variant="secondary" href="/login">Login</NavbarButton>
            <NavbarButton variant="primary" href="/signup">Sign Up</NavbarButton>
          </div>
        </NavBody>
        <MobileNav>
          <MobileNavHeader>
            <a href="#" className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-white">
              <img
                src={logoUrl || "/Gearflow logo.png"}
                alt="Flow Tag Logo"
                width={30}
                height={30}
                className="rounded-lg object-contain"
              />
              <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Flow Tag</span>
            </a>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>
          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <div className="flex w-full flex-col gap-4 mt-2">
              <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="secondary"
                href="/login"
                className="w-full"
              >
                Login
              </NavbarButton>
              <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                href="/signup"
                className="w-full"
              >
                Sign Up
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

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
            <AlertDescription>
              {configError}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
}
