import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a self-contained server under .next/standalone — required for Docker.
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // Prevent Next.js from bundling these — they rely on Node.js internals
  // and must run as native requires in the Node.js runtime.
  serverExternalPackages: ['@react-pdf/renderer'],

  experimental: {
    serverActions: {
      // Comma-separated additional origins allowed to call Server Actions.
      // In production set ALLOWED_ORIGINS to your public domain(s).
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['localhost:3000'],
    },
  },
};

export default nextConfig;
