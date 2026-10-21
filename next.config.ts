import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['stripe'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
      { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};
export default nextConfig;
