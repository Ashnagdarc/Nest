import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // Only ignore build errors in production
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Only ignore ESLint during builds in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lkgxzrvcozfxydpmbtqq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withBundleAnalyzer(withPWA(nextConfig));
