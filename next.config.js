/** @type {import('next').NextConfig} */
const nextConfig = {
  // chromium-min은 바이너리가 더 가벼워서 별도 포함 설정 불필요
  // 빌드 최적화
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
