/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    // ChatGPT parsing API routes에 chromium 바이너리 강제 포함
    'src/app/api/minutes/[id]/blocks/link/preview/route.ts': [
      './node_modules/@sparticuz/chromium/bin/*',
      './node_modules/@sparticuz/chromium/lib/*',
      './node_modules/@sparticuz/chromium/swiftshader/*',
    ],
    'src/app/api/projects/[id]/blocks/link/route.ts': [
      './node_modules/@sparticuz/chromium/bin/*',
      './node_modules/@sparticuz/chromium/lib/*',
      './node_modules/@sparticuz/chromium/swiftshader/*',
    ],
  },
};

module.exports = nextConfig;
