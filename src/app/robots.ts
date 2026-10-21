import type { MetadataRoute } from 'next';
import { readiness } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { live } = await readiness();
  return {
    rules: {
      userAgent: '*',
      allow: live ? '/' : undefined,
      disallow: live ? ['/portal', '/admin', '/api', '/auth', '/anfrage'] : '/',
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sitemap.xml`,
  };
}
