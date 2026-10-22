import type { Metadata } from 'next';
import { Eyebrow } from '@/components/ui';
import { IntakeWizard } from '@/components/intake-wizard';
import { readiness } from '@/lib/settings';
export const metadata: Metadata = {
  title: 'Rechtsberatung anfragen',
  robots: { index: false, follow: false },
};
export default async function Inquiry({
  searchParams,
}: {
  searchParams: Promise<{ gebiet?: string }>;
}) {
  const [ready, params] = await Promise.all([readiness(), searchParams]);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Eyebrow>Ihre Mandatsanfrage</Eyebrow>
          <h1>Erzählen Sie uns, worum es geht.</h1>
          <p>
            Sechs Schritte helfen, Ihre Situation zu ordnen. Sie können Ihre Angaben vor dem
            Absenden vollständig prüfen.
          </p>
        </div>
      </section>
      <section className="section" style={{ background: 'var(--paper)' }}>
        <div className="container">
          <IntakeWizard
            initialPractice={
              ['strafrecht', 'steuerrecht', 'it-recht', 'online-betrug'].includes(
                params.gebiet || '',
              )
                ? params.gebiet!
                : ''
            }
            {...ready}
          />
        </div>
      </section>
    </>
  );
}
