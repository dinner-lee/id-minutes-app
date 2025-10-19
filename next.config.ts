import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': [
        './node_modules/@sparticuz/chromium/bin/al2023.tar.br',
        './node_modules/@sparticuz/chromium/bin/al2.tar.br',
        './node_modules/@sparticuz/chromium/bin/chromium.br',
        './node_modules/@sparticuz/chromium/bin/fonts.tar.br',
        './node_modules/@sparticuz/chromium/bin/swiftshader.tar.br',
        './node_modules/@sparticuz/chromium/bin/*',
        './node_modules/@sparticuz/chromium/lib/*',
        './node_modules/@sparticuz/chromium/swiftshader/*'
      ]
    },
  },
};

export default nextConfig;
