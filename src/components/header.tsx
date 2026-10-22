'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Menu, X, LockKeyhole } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { BRAND } from '@/lib/branding';
export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = [
    ['Startseite', '/'],
    ['Rechtsgebiete', '/rechtsgebiete'],
    ['So funktioniert es', '/ablauf'],
    ['Über die Kanzlei', '/kanzlei'],
    ['Häufige Fragen', '/faq'],
    ['Kontakt', '/kontakt'],
  ];
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          className="brand"
          href="/"
          onClick={() => setOpen(false)}
          aria-label={`${BRAND.name} – Startseite`}
        >
          <BrandLogo preload />
        </Link>
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
          aria-expanded={open}
          aria-controls="main-nav"
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-nav"
          className={open ? 'main-nav open' : 'main-nav'}
          aria-label="Hauptnavigation"
        >
          {links.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? 'active' : ''}
              onClick={() => setOpen(false)}
            >
              {name}
            </Link>
          ))}
          <Link className="mobile-login" href="/mandantenbereich" onClick={() => setOpen(false)}>
            Mandantenlogin
          </Link>
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/mandantenbereich">
            <LockKeyhole size={13} />
            Mandantenlogin
          </Link>
          <Link className="header-cta" href="/anfrage">
            Beratung anfragen
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
