/* eslint-disable no-undef */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Temporarily disable PWA to test for compatibility issues
// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development',
//   runtimeCaching: [
//     {
//       urlPattern: /^https:\/\/lkgxzrvcozfxydpmbtqq\.supabase\.co\/storage\/v1\/object\/public\/.*/,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'supabase-images',
//         expiration: {
//           maxEntries: 50,
//           maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
//         },
//       },
//     },
//     {
//       urlPattern: /\/_next\/image\?url=.*/i,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'next-image',
//         expiration: {
//           maxEntries: 60,
//           maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
//         },
//       },
//     },
//     {
//       urlPattern: /\/_next\/static\/.*/i,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'static-resources',
//         expiration: {
//           maxEntries: 200,
//           maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
//         },
//       },
//     },
//     {
//       urlPattern: /\.(?:eot|ttf|woff|woff2)$/i,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'static-fonts',
//         expiration: {
//           maxEntries: 20,
//           maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
//         },
//       },
//     },
//     {
//       urlPattern: /^https?.*/,
//       handler: 'NetworkFirst',
//       options: {
//         cacheName: 'offline-cache',
//         networkTimeoutSeconds: 10,
//         expiration: {
//           maxEntries: 200,
//           maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
//         },
//       },
//     },
//   ],
// });

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
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
