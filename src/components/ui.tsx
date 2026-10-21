import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Scale,
  FileText,
  Code2,
  ShieldCheck,
  LockKeyhole,
  ChevronDown,
} from 'lucide-react';
export const icons = { scale: Scale, file: FileText, code: Code2, shield: ShieldCheck };
export function Button({
  children,
  href,
  secondary = false,
  ...props
}: React.ComponentProps<typeof Link> & { secondary?: boolean }) {
  return (
    <Link href={href} className={`button ${secondary ? 'button-secondary' : ''}`} {...props}>
      {children}
      <ArrowUpRight size={17} aria-hidden="true" />
    </Link>
  );
}
export function Eyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p className={`eyebrow ${light ? 'eyebrow-light' : ''}`}>
      <span />
      {children}
    </p>
  );
}
export function FaqList({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="faq-list">
      {items.map(([q, a]) => (
        <details key={q}>
          <summary>
            {q}
            <ChevronDown size={19} aria-hidden="true" />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
export function ContactCta() {
  return (
    <section className="contact-cta">
      <div className="container cta-inner">
        <div>
          <Eyebrow light>Der nächste Schritt</Eyebrow>
          <h2>Eine Frage ist ein guter Anfang.</h2>
          <p>Schildern Sie, was Sie beschäftigt. Wir klären, wie es weitergehen kann.</p>
        </div>
        <Button href="/anfrage">Rechtsberatung anfragen</Button>
      </div>
    </section>
  );
}
export function SecureNote() {
  return (
    <span className="secure-note">
      <LockKeyhole size={13} aria-hidden="true" />
      Geschützter Mandantenbereich
    </span>
  );
}
export { ArrowRight };
