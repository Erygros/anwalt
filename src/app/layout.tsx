import type { Metadata, Viewport } from 'next';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getFirm, readiness } from '@/lib/settings';
import { headers } from 'next/headers';
import { BRAND } from '@/lib/branding';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export async function generateMetadata(): Promise<Metadata> {
  const ready = await readiness();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${BRAND.name} | ${BRAND.tagline}`,
      template: `%s | ${BRAND.name}`,
    },
    description:
      'Anwaltliche Beratung im Strafrecht, Steuerrecht, IT-Recht und bei Online-Betrug anfragen. Ablauf, Kosten und geschützte digitale Kommunikation.',
    openGraph: {
      locale: 'de_DE',
      type: 'website',
      siteName: BRAND.name,
      title: `${BRAND.name} | ${BRAND.tagline}`,
      images: [
        {
          url: BRAND.assets.social,
          width: 1200,
          height: 630,
          alt: `${BRAND.name} – Ihr Recht. Unsere Expertise. Vollständig digital.`,
        },
      ],
    },
    applicationName: BRAND.name,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: BRAND.assets.favicon, sizes: 'any' },
        { url: BRAND.assets.favicon32, sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: BRAND.assets.apple, sizes: '180x180', type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${BRAND.name} | ${BRAND.tagline}`,
      images: [BRAND.assets.social],
    },
    robots: ready.live ? { index: true, follow: true } : { index: false, follow: false },
  };
}
export const viewport: Viewport = {
  themeColor: BRAND.colors.primary,
  width: 'device-width',
  initialScale: 1,
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const [firm, ready] = await Promise.all([getFirm(), readiness()]);
  const schema = ready.live
    ? {
        '@context': 'https://schema.org',
        '@type': 'LegalService',
        name: firm.legalName,
        alternateName: BRAND.name,
        logo: `${siteUrl}${BRAND.assets.logoDark}`,
        image: `${siteUrl}${BRAND.assets.social}`,
        url: siteUrl,
        address: firm.address,
        email: firm.email,
        telephone: firm.phone,
        areaServed: 'DE',
        knowsAbout: ['Strafrecht', 'Steuerrecht', 'IT-Recht', 'Online-Betrug'],
      }
    : null;
  return (
    <html
      lang="de"
      style={
        {
          '--brand-primary': BRAND.colors.primary,
          '--brand-secondary': BRAND.colors.secondary,
          '--brand-white': BRAND.colors.white,
          '--brand-silver': BRAND.colors.silver,
        } as React.CSSProperties
      }
    >
      <body>
        <a href="#main" className="skip-link">
          Zum Inhalt
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer firm={firm} />
        {schema && (
          <script
            nonce={nonce}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
          />
        )}
      </body>
    </html>
  );
}
