/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["localhost"],
  },
  typescript: {
    // Allows production builds to succeed even if there are type errors
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
