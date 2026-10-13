/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/hubs/:path*',
        destination: 'http://localhost:5000/hubs/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
