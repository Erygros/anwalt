import type { Metadata } from 'next';
import { Eyebrow } from '@/components/ui';
import { AuthForm } from '@/components/auth-form';
import { configured } from '@/lib/supabase/server';
import { getSession } from '@/lib/api-actions';
import { redirect } from 'next/navigation';
export const metadata: Metadata = {
  title: 'Mandantenlogin',
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const s = await getSession();
  if (s.authenticated && !s.mfaRequired && !params.reset) redirect(s.staff ? '/admin' : '/portal');
  return (
    <section className="section">
      <div className="container auth-layout">
        <div>
          <Eyebrow>Ihr Mandantenbereich</Eyebrow>
          <h1>
            Ihre Angelegenheit.
            <br />
            <em>Ihr Überblick.</em>
          </h1>
          <p style={{ marginTop: 25 }}>
            Nachrichten, Unterlagen, Termine und Rechnungen – Ihrer Akte zugeordnet und nur für
            berechtigte Personen zugänglich.
          </p>
          <div className="notice">
            E-Mails kündigen neue Mitteilungen an. Vertrauliche Inhalte lesen Sie nach der Anmeldung
            im geschützten Bereich.
          </div>
          {params.error && (
            <div className="notice error">
              Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link
              an oder melden Sie sich erneut an.
            </div>
          )}
        </div>
        <AuthForm configured={configured()} reset={params.reset === '1'} />
      </div>
    </section>
  );
}
