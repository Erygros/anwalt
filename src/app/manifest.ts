import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/branding';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: 'Ihre digitale Kanzlei für Strafrecht, Steuerrecht, IT-Recht und Online-Betrug.',
    lang: 'de',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BRAND.colors.white,
    theme_color: BRAND.colors.primary,
    icons: [
      { src: BRAND.assets.app192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: BRAND.assets.app512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
