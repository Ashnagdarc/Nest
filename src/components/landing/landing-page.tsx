"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Package, Clock, BarChart, Users, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
    const fetchLogo = async () => {
      setIsLoadingLogo(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'logoUrl')
          .single();

        if (error) throw error;
        setLogoUrl(data?.value || null);
      } catch (fetchError) {
        console.error("Error fetching Supabase settings for logo:", fetchError);
        setConfigError("Could not fetch application settings.");
        setLogoUrl(null);
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
    <div className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full">
        {/* Navigation */}
        <nav className="w-full px-4 sm:px-6 py-4 sm:py-6 backdrop-blur-sm bg-black/20 sticky top-0 z-50">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              {!isLoadingLogo && logoUrl ? (
                <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg blur opacity-50"></div>
                  <Image
                    src={logoUrl}
                    alt="GearFlow Logo"
                    fill
                    className="relative rounded-lg object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent leading-tight">
                  GearFlow
                </span>
                <span className="text-xs sm:text-sm font-medium dark:text-white text-black leading-tight">
                  by Eden Oasis
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:text-orange-400 transition-colors px-2 sm:px-4 h-8 sm:h-10 text-sm sm:text-base">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 h-8 sm:h-10 px-3 sm:px-4 text-sm sm:text-base">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center w-full max-w-4xl mx-auto relative"
          >
            {/* Decorative elements */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl opacity-60 hidden sm:block" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl opacity-60 hidden sm:block" />

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-[1.1] sm:leading-tight">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent block mb-2"
              >
                Streamline Gear
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-white block text-3xl sm:text-5xl md:text-6xl"
              >
                Management for
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-white block text-3xl sm:text-5xl md:text-6xl"
              >
                Eden Oasis
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0"
            >
              Efficiently track, request, and manage company equipment with our intuitive platform designed for real estate professionals.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center px-4 sm:px-0"
            >
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-base sm:text-lg rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 hover:from-orange-600 hover:to-orange-700">
                  Get Started
                </Button>
              </Link>
              <Link href="/signup" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-12 text-base sm:text-lg border-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all duration-300 hover:border-orange-500/50">
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full max-w-7xl mx-auto mt-16 sm:mt-24 px-4 sm:px-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="group relative bg-gradient-to-b from-[#111111] to-[#0A0A0A] rounded-xl p-6 sm:p-8 hover:from-[#1A1A1A] hover:to-[#111111] transition-all duration-300 shadow-xl shadow-black/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-transparent rounded-xl transition-all duration-300" />
                <div className="relative">
                  <div className="text-orange-500 mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    <div className="w-6 h-6 sm:w-8 sm:h-8">{feature.icon}</div>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-white group-hover:text-orange-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 group-hover:text-gray-300 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
