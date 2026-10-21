import type { MetadataRoute } from 'next';
import { readiness } from '@/lib/settings';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!(await readiness()).live) return [];
  return [
    '',
    'rechtsgebiete',
    'strafrecht',
    'steuerrecht',
    'it-recht',
    'online-betrug',
    'kanzlei',
    'ablauf',
    'kosten',
    'kontakt',
    'faq',
    'impressum',
    'datenschutz',
  ].map((path) => ({
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${path}`,
    changeFrequency: 'monthly',
    priority: path ? 0.6 : 1,
  }));
}
