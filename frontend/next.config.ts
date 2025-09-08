import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone build for Docker deployment
  output: 'standalone',
  
  // Disable ESLint during build for production
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build for production
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'decentralbet-production',
  },
  
  // Image optimization
  images: {
    domains: [],
    unoptimized: true, // For better Docker compatibility
  },
};

export default nextConfig;
