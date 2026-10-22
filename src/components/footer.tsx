import Link from 'next/link';
import type { Firm } from '@/lib/firm';
import { BrandLogo } from './brand-logo';
import { BRAND } from '@/lib/branding';
export function Footer({ firm }: { firm: Firm }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="brand" href="/" aria-label={`${BRAND.name} – Startseite`}>
              <BrandLogo light />
            </Link>
            <p>
              Rechtliche Fragen verdienen eine klare Antwort.
              <br />
              Und einen persönlichen Ansprechpartner.
            </p>
            {firm.legalName && (
              <address>
                {firm.legalName}
                <br />
                {firm.address}
                <br />
                {firm.email && <a href={`mailto:${firm.email}`}>{firm.email}</a>}
                <br />
                {firm.phone && <a href={`tel:${firm.phone.replace(/\s/g, '')}`}>{firm.phone}</a>}
              </address>
            )}
          </div>
          <div>
            <h3>Rechtsgebiete</h3>
            <Link href="/strafrecht">Strafrecht</Link>
            <Link href="/steuerrecht">Steuerrecht</Link>
            <Link href="/it-recht">IT-Recht</Link>
            <Link href="/online-betrug">Online-Betrug</Link>
          </div>
          <div>
            <h3>Ihre Beratung</h3>
            <Link href="/anfrage">Mandatsanfrage</Link>
            <Link href="/ablauf">So funktioniert es</Link>
            <Link href="/kosten">Kosten & Vergütung</Link>
            <Link href="/termin">Termin vereinbaren</Link>
          </div>
          <div>
            <h3>Die Kanzlei</h3>
            <Link href="/kanzlei">Über die Kanzlei</Link>
            <Link href="/kontakt">Kontakt</Link>
            <Link href="/faq">Häufige Fragen</Link>
            <Link href="/mandantenbereich">Mandantenbereich</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {BRAND.name}
          </span>
          <span>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/barrierefreiheit">Barrierefreiheit</Link>
          </span>
          <span>Mit Sorgfalt. Mit Haltung.</span>
        </div>
      </div>
    </footer>
  );
}
