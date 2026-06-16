/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.VERCEL ? undefined : 'dist',
};

export default nextConfig;