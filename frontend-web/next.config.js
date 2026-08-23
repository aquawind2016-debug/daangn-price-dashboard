/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/daangn-price-dashboard',
  assetPrefix: '/daangn-price-dashboard/',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
