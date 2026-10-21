import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { requireUser } from '@/lib/security';
import { getFirm, readiness } from '@/lib/settings';
import { loadCase } from '@/lib/workspace-data';
import { PortalNav } from '@/components/portal-nav';
import { CaseWorkspace } from '@/components/case-workspace';
import { ProfileForm } from '@/components/profile-form';
import { AppointmentList } from '@/components/appointment-list';
import { InvoiceList } from '@/components/invoice-list';
import { statusLabels } from '@/lib/validation';
import type { Appointment, CaseRecord, Profile } from '@/lib/types';
export const metadata: Metadata = {
  title: 'Mein Mandantenbereich',
  robots: { index: false, follow: false },
};
export default async function Portal({ params }: { params: Promise<{ section?: string[] }> }) {
  const ctx = await requireUser().catch(() => null);
  if (!ctx) redirect('/mandantenbereich');
  if (ctx.role) redirect('/admin');
  const parts = (await params).section ?? [];
  const section = parts[0] || 'uebersicht';
  const [firm, ready] = await Promise.all([getFirm(), readiness()]);
  let body: React.ReactNode;
  if (section === 'akten' && parts[1]) {
    const data = await loadCase(parts[1]);
    body = (
      <CaseWorkspace
        record={data.ctx.record as CaseRecord}
        events={data.events}
        messages={data.messages}
        documents={data.documents}
        tasks={[]}
        userId={ctx.user.id}
        uploads={ready.uploads}
        services={[]}
      />
    );
  } else
    switch (section) {
      case 'uebersicht': {
        const [cases, appointments, notifications] = await Promise.all([
          ctx.client
            .from('cases')
            .select('id,reference,subject,status,created_at')
            .neq('status', 'draft')
            .order('created_at', { ascending: false }),
          ctx.client.from('appointments').select('id').eq('status', 'booked'),
          ctx.client
            .from('notifications')
            .select('id,title,href,created_at')
            .is('read_at', null)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);
        body = (
          <>
            <p className="eyebrow">Ihr geschützter Zugang</p>
            <h1>Alles Wichtige zu Ihrer Angelegenheit.</h1>
            <p>Hier finden Sie Ihre Anfragen, laufenden Mandate und neuen Mitteilungen.</p>
            <div className="dashboard-grid">
              <div className="stat-card">
                <strong>{cases.data?.length ?? 0}</strong>
                <span>Anfragen & Akten</span>
              </div>
              <div className="stat-card">
                <strong>{appointments.data?.length ?? 0}</strong>
                <span>Gebuchte Termine</span>
              </div>
              <div className="stat-card">
                <strong>{notifications.data?.length ?? 0}</strong>
                <span>Neue Mitteilungen</span>
              </div>
            </div>
            <section className="section-panel">
              <h2>Ihre Akten</h2>
              {cases.data?.length ? (
                <ul className="data-list">
                  {cases.data.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link href={`/portal/akten/${c.id}`}>
                        <h3>
                          {c.subject}
                          <span className="badge pending">{statusLabels[c.status]}</span>
                        </h3>
                        <p>{c.reference}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <h3>Ihr Anliegen beginnt hier.</h3>
                  <p>
                    Stellen Sie eine Anfrage. Nach der Prüfung sehen Sie den weiteren Stand an
                    dieser Stelle.
                  </p>
                  <Link className="button" href="/anfrage">
                    Rechtsberatung anfragen
                  </Link>
                </div>
              )}
            </section>
            {!!notifications.data?.length && (
              <section className="section-panel">
                <h2>Neue Mitteilungen</h2>
                <ul className="data-list">
                  {notifications.data.map((n) => (
                    <li key={n.id}>
                      <Link href={n.href}>
                        <span className="notification-dot" />
                        {n.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link className="text-link" href="/portal/mitteilungen">
                  Alle Mitteilungen öffnen →
                </Link>
              </section>
            )}
          </>
        );
        break;
      }
      case 'akten': {
        const { data } = await ctx.client
          .from('cases')
          .select('id,reference,subject,status,created_at')
          .order('created_at', { ascending: false });
        body = (
          <>
            <h1>Meine Akten</h1>
            <p>Anfragen, laufende Mandate und abgeschlossene Angelegenheiten.</p>
            <Link className="button" href="/anfrage">
              Neue Anfrage
            </Link>
            <ul className="data-list">
              {data?.map((c) => (
                <li key={c.id}>
                  <Link href={`/portal/akten/${c.id}`}>
                    <h3>
                      {c.subject || 'Nicht übermittelter Entwurf'}
                      <span className="badge pending">{statusLabels[c.status]}</span>
                    </h3>
                    <p>
                      {c.reference} · {new Date(c.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            {!data?.length && <div className="notice">Sie haben noch keine Anfrage gestellt.</div>}
          </>
        );
        break;
      }
      case 'termine': {
        const { data } = await ctx.client
          .from('appointments')
          .select('*,availability_slots(*)')
          .order('created_at', { ascending: false });
        body = (
          <>
            <h1>Meine Termine</h1>
            <p>Telefon- und Videoberatungen verwalten. Die Anzeige erfolgt in deutscher Zeit.</p>
            <AppointmentList appointments={(data ?? []) as Appointment[]} />
          </>
        );
        break;
      }
      case 'rechnungen': {
        const { data } = await ctx.client
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        body = (
          <>
            <h1>Rechnungen & Zahlungen</h1>
            <p>
              Nur konkret vereinbarte und von der Kanzlei hinterlegte Leistungen werden angezeigt.
            </p>
            <InvoiceList
              invoices={data ?? []}
              payments={ready.payments}
              terms={firm.mandateTerms}
              cancellation={firm.cancellationText}
            />
          </>
        );
        break;
      }
      case 'mitteilungen': {
        const { data } = await ctx.client
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        body = (
          <>
            <h1>Mitteilungen</h1>
            <p>
              Hinweise zu Ihren Akten. Vertrauliche Inhalte finden Sie in der jeweiligen Nachricht.
            </p>
            <ul className="data-list">
              {data?.map((n) => (
                <li key={n.id}>
                  <Link href={n.href}>
                    {!n.read_at && <span className="notification-dot" />}
                    {n.title}
                    <p>{new Date(n.created_at).toLocaleDateString('de-DE')}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {!data?.length && <div className="notice">Aktuell liegen keine Mitteilungen vor.</div>}
            <MarkRead />
          </>
        );
        break;
      }
      case 'stammdaten': {
        const { data } = await ctx.client
          .from('profiles')
          .select('full_name,phone,company,address')
          .eq('id', ctx.user.id)
          .single();
        body = (
          <>
            <h1>Stammdaten & Sicherheit</h1>
            <p>Halten Sie Ihre Kontaktdaten aktuell und verwalten Sie Ihren Zugang.</p>
            <ProfileForm
              initial={(data ?? { full_name: '', phone: '', company: '', address: '' }) as Profile}
              email={ctx.user.email || ''}
            />
          </>
        );
        break;
      }
      default:
        notFound();
    }
  return (
    <div className="container portal-layout">
      <PortalNav />
      <div className="portal-main">{body}</div>
    </div>
  );
}
import { MarkRead } from '@/components/mark-read';
