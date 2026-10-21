import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { const live = process.env.FIRM_LIVE === 'true'; return { rules: { userAgent: '*', allow: live ? '/' : undefined, disallow: live ? ['/portal', '/admin', '/api', '/auth', '/anfrage'] : '/' }, sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sitemap.xml` }; }
