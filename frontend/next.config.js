/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_API_URL || 'http://localhost:5000/api/:path*',
      },
      {
        source: '/hubs/:path*',
        destination: process.env.INTERNAL_API_URL
          ? `${process.env.INTERNAL_API_URL.replace(/\/api$/, '')}/hubs/:path*`
          : 'http://localhost:5000/hubs/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
