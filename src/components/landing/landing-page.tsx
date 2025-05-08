"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Package, BarChart, Clock, Users, Laptop, Boxes } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
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

  // Features list
  const features = [
    { icon: <Package className="h-6 w-6 text-primary" />, title: "Track Equipment", description: "Keep detailed records of all company gear" },
    { icon: <Clock className="h-6 w-6 text-primary" />, title: "Request & Schedule", description: "Book gear when you need it" },
    { icon: <BarChart className="h-6 w-6 text-primary" />, title: "Analytics", description: "Track usage patterns and equipment status" },
    { icon: <Users className="h-6 w-6 text-primary" />, title: "Team Management", description: "Coordinate equipment use across teams" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 py-12 flex flex-col min-h-screen">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row items-center justify-between flex-grow gap-8 md:gap-4"
        >
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 text-center md:text-left max-w-xl"
          >
            <div className="flex justify-center md:justify-start mb-6">
              {isLoadingLogo && !configError ? (
                <div className="h-[100px] w-[100px] rounded-xl bg-primary/10 animate-pulse"></div>
              ) : logoUrl ? (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-50 group-hover:opacity-70 transition duration-1000"></div>
                  <div className="relative">
                    <Image
                      key={logoUrl}
                      src={logoUrl}
                      alt="GearFlow Logo"
                      width={100}
                      height={100}
                      className="rounded-xl border-2 border-primary/20 object-contain bg-card shadow-lg"
                      data-ai-hint="gear logo"
                      unoptimized
                    />
                  </div>
                </div>
              ) : !configError ? (
                <div className="flex h-[100px] w-[100px] items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Boxes className="h-12 w-12" />
                </div>
              ) : null}
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4"
            >
              GearFlow
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-muted-foreground mb-6"
            >
              Streamline Gear Management for Eden Oasis Realty
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-lg text-foreground/80 mb-8 max-w-md mx-auto md:mx-0"
            >
              Efficiently track, request, and manage company equipment with our intuitive platform designed for real estate professionals.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-8 rounded-full border-primary/20 hover:bg-primary/5 transition-all duration-300"
                >
                  Sign Up
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Content - Lottie Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-1 flex justify-center items-center max-w-md"
          >
            <div className="relative w-full h-[300px] md:h-[400px] flex items-center justify-center">
              <DotLottieReact
                src="https://lottie.host/0d28b562-b9c1-4325-afd9-ab949926269f/ZuOa1NgnjO.lottie"
                loop
                autoplay
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-12 md:mt-24"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Key Features</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
              >
                <Card className="h-full hover:shadow-md transition-all duration-300 border-primary/10 hover:border-primary/20 bg-card/80">
                  <CardContent className="p-6">
                    <div className="mb-4 bg-primary/5 w-12 h-12 flex items-center justify-center rounded-lg">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Eden Oasis Realty. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Error Alert */}
      {configError && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              {configError} Ensure Supabase URL/Key are set and RLS allows reading settings.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
