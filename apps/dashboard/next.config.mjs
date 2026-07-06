/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@naty/shared'],
  output: 'standalone',
};

export default nextConfig;
