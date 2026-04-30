/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};
module.exports = nextConfig;
