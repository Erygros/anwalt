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
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), title: { default: 'Digitaler Anwalt | Recht. Persönlich. Digital.', template: '%s | Digitaler Anwalt' },
  description: 'Anwaltliche Beratung im Strafrecht, Steuerrecht, IT-Recht und bei Online-Betrug anfragen. Ablauf, Kosten und geschützte digitale Kommunikation.',
  openGraph: { locale: 'de_DE', type: 'website', siteName: 'Digitaler Anwalt', images: ['/opengraph-image'] },
  robots: process.env.FIRM_LIVE === 'true' ? { index: true, follow: true } : { index: false, follow: false }
};
export const viewport: Viewport = { themeColor: '#142d40', width: 'device-width', initialScale: 1 };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [firm, ready] = await Promise.all([getFirm(), readiness()]);
  const schema = ready.live ? { '@context': 'https://schema.org', '@type': 'LegalService', name: firm.legalName, url: siteUrl, address: firm.address, email: firm.email, telephone: firm.phone, areaServed: 'DE', knowsAbout: ['Strafrecht', 'Steuerrecht', 'IT-Recht', 'Online-Betrug'] } : null;
  return <html lang="de"><body><a href="#main" className="skip-link">Zum Inhalt</a>{!ready.live && <div className="preview-bar">Vorbereitung des Kanzleistarts · Mandatsannahme und Buchung sind noch nicht freigeschaltet.</div>}<Header brand={firm.brand} /><main id="main">{children}</main><Footer firm={firm} />{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />}</body></html>;
}
