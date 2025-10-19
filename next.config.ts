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
      'src/app/api/minutes/[id]/blocks/link/preview/route.ts': [
        './node_modules/@sparticuz/chromium/bin/al2023.tar.br',
        './node_modules/@sparticuz/chromium/bin/al2.tar.br',
        './node_modules/@sparticuz/chromium/bin/chromium.br',
        './node_modules/@sparticuz/chromium/bin/fonts.tar.br',
        './node_modules/@sparticuz/chromium/bin/swiftshader.tar.br',
        './node_modules/@sparticuz/chromium/bin/*',
        './node_modules/@sparticuz/chromium/lib/*',
        './node_modules/@sparticuz/chromium/swiftshader/*'
      ],
      'src/app/api/projects/[id]/blocks/link/route.ts': [
        './node_modules/@sparticuz/chromium/bin/al2023.tar.br',
        './node_modules/@sparticuz/chromium/bin/al2.tar.br',
        './node_modules/@sparticuz/chromium/bin/chromium.br',
        './node_modules/@sparticuz/chromium/bin/fonts.tar.br',
        './node_modules/@sparticuz/chromium/bin/swiftshader.tar.br',
        './node_modules/@sparticuz/chromium/bin/*',
        './node_modules/@sparticuz/chromium/lib/*',
        './node_modules/@sparticuz/chromium/swiftshader/*'
      ],
      'src/app/api/test-puppeteer-parsing/route.ts': [
        './node_modules/@sparticuz/chromium/bin/al2023.tar.br',
        './node_modules/@sparticuz/chromium/bin/al2.tar.br',
        './node_modules/@sparticuz/chromium/bin/chromium.br',
        './node_modules/@sparticuz/chromium/bin/fonts.tar.br',
        './node_modules/@sparticuz/chromium/bin/swiftshader.tar.br',
        './node_modules/@sparticuz/chromium/bin/*',
        './node_modules/@sparticuz/chromium/lib/*',
        './node_modules/@sparticuz/chromium/swiftshader/*'
      ],
      'src/app/api/debug-chatgpt-parsing/route.ts': [
        './node_modules/@sparticuz/chromium/bin/al2023.tar.br',
        './node_modules/@sparticuz/chromium/bin/al2.tar.br',
        './node_modules/@sparticuz/chromium/bin/chromium.br',
        './node_modules/@sparticuz/chromium/bin/fonts.tar.br',
        './node_modules/@sparticuz/chromium/bin/swiftshader.tar.br',
        './node_modules/@sparticuz/chromium/bin/*',
        './node_modules/@sparticuz/chromium/lib/*',
        './node_modules/@sparticuz/chromium/swiftshader/*'
      ],
      'src/app/api/test-vercel-config/route.ts': [
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
