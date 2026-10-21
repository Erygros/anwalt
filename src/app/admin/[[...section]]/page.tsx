import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { requireStaff, audit } from '@/lib/security';
import { getFirm, readiness } from '@/lib/settings';
import { loadCase } from '@/lib/workspace-data';
import { PortalNav } from '@/components/portal-nav';
import { CaseWorkspace } from '@/components/case-workspace';
import { FirmEditor } from '@/components/firm-editor';
import {
  AvailabilityManager,
  StaffManager,
  TaskManager,
  PrivacyManager,
  ClientManager,
} from '@/components/admin-controls';
import { AppointmentList } from '@/components/appointment-list';
import { InvoiceList } from '@/components/invoice-list';
import { statusLabels } from '@/lib/validation';
import type { Appointment, CaseRecord } from '@/lib/types';
export const metadata: Metadata = {
  title: 'Kanzleiverwaltung',
  robots: { index: false, follow: false },
};
export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ suche?: string; status?: string }>;
}) {
  const ctx = await requireStaff().catch(() => null);
  if (!ctx) redirect('/mandantenbereich');
  const section = (await params).section ?? [];
  const name = section[0] || 'uebersicht';
  const [firm, ready] = await Promise.all([getFirm(), readiness()]);
  const admin = ctx.role === 'admin';
  let body: React.ReactNode;
  if (name === 'akten' && section[1]) {
    const data = await loadCase(section[1]);
    body = (
      <CaseWorkspace
        record={data.ctx.record as CaseRecord}
        events={data.events}
        messages={data.messages}
        documents={data.documents}
        tasks={data.tasks}
        userId={ctx.user.id}
        role={ctx.role}
        uploads={ready.uploads}
        services={firm.services}
        members={data.members}
      />
    );
  } else
    switch (name) {
      case 'uebersicht': {
        const [cases, tasks, appointments] = await Promise.all([
          ctx.client
            .from('cases')
            .select('id,subject,status,reference,urgency,deadline')
            .in('status', ['submitted', 'conflict_review'])
            .order('created_at'),
          ctx.client.from('tasks').select('id').is('completed_at', null),
          ctx.client.from('appointments').select('id').eq('status', 'booked'),
        ]);
        body = (
          <>
            <p className="eyebrow">Kanzleiverwaltung · {ctx.role}</p>
            <h1>Was jetzt ansteht.</h1>
            <p>Eingänge, Termine und Aufgaben aus den für Sie freigegebenen Akten.</p>
            <div className="dashboard-grid">
              <div className="stat-card">
                <strong>{cases.data?.length ?? 0}</strong>
                <span>Anfragen zur Prüfung</span>
              </div>
              <div className="stat-card">
                <strong>{tasks.data?.length ?? 0}</strong>
                <span>Offene Aufgaben & Fristen</span>
              </div>
              <div className="stat-card">
                <strong>{appointments.data?.length ?? 0}</strong>
                <span>Gebuchte Termine</span>
              </div>
            </div>
            {!ready.live && (
              <div className="notice">
                Der Beratungsbetrieb ist gesperrt.{' '}
                {admin ? (
                  <Link href="/admin/einstellungen">
                    Kanzleidaten und Pflichttexte vervollständigen →
                  </Link>
                ) : (
                  'Die Administration muss die Kanzleidaten und Dienste vervollständigen.'
                )}
              </div>
            )}
            <section className="section-panel">
              <h2>Neue Mandatsanfragen</h2>
              <ul className="data-list">
                {cases.data?.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/akten/${c.id}`}>
                      <h3>
                        {c.subject}
                        <span className="badge pending">{statusLabels[c.status]}</span>
                      </h3>
                      <p>
                        {c.reference} · {c.urgency}
                        {c.deadline ? ` · Frist: ${c.deadline}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {!cases.data?.length && (
                <p>Zurzeit liegen keine neuen, für Sie freigegebenen Anfragen vor.</p>
              )}
            </section>
          </>
        );
        break;
      }
      case 'akten': {
        const filters = await searchParams;
        let query = ctx.client
          .from('cases')
          .select('*')
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(100);
        if (
          ['submitted', 'conflict_review', 'accepted', 'declined', 'closed'].includes(
            filters.status || '',
          )
        )
          query = query.eq('status', filters.status);
        if (filters.suche)
          query = query.ilike('subject', `%${filters.suche.replace(/[%_]/g, '').slice(0, 100)}%`);
        const { data } = await query;
        await audit(ctx.user.id, 'list', 'cases');
        body = (
          <>
            <h1>Akten & Anfragen</h1>
            <p>Nur für Ihre Rolle und Ihre Aktenfreigaben sichtbare Vorgänge.</p>
            <form className="form-row" method="get">
              <div className="form-field">
                <label htmlFor="search">Anliegen suchen</label>
                <input id="search" name="suche" defaultValue={filters.suche} maxLength={100} />
              </div>
              <div className="form-field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={filters.status || ''}>
                  <option value="">Alle</option>
                  {['submitted', 'conflict_review', 'accepted', 'declined', 'closed'].map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="small-button" style={{ alignSelf: 'end', marginBottom: 20 }}>
                Filtern
              </button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vorgang</th>
                    <th>Anliegen</th>
                    <th>Status</th>
                    <th>Frist</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/akten/${c.id}`}>{c.reference} ↗</Link>
                      </td>
                      <td>{c.subject}</td>
                      <td>{statusLabels[c.status]}</td>
                      <td>{c.deadline || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data?.length && <div className="notice">Keine passenden Akten vorhanden.</div>}
          </>
        );
        break;
      }
      case 'mandanten': {
        const { data } = await ctx.client
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        await audit(ctx.user.id, 'list', 'clients');
        body = (
          <>
            <h1>Mandanten</h1>
            <p>
              Kontaktdaten der für Sie sichtbaren Mandantenkonten. Änderungen sind für berechtigte
              Mitarbeiter möglich und werden protokolliert.
            </p>
            <ClientManager profiles={data ?? []} />
          </>
        );
        break;
      }
      case 'termine': {
        const [appointments, slots] = await Promise.all([
          ctx.client
            .from('appointments')
            .select('*,availability_slots(*)')
            .order('created_at', { ascending: false })
            .limit(100),
          ctx.client
            .from('availability_slots')
            .select('*')
            .gte('starts_at', new Date().toISOString())
            .order('starts_at')
            .limit(200),
        ]);
        body = (
          <>
            <h1>Termine & Verfügbarkeit</h1>
            <p>Termine und freigegebene Beratungsfenster verwalten.</p>
            <AppointmentList
              appointments={(appointments.data ?? []) as Appointment[]}
              staff
              videoHost={process.env.VIDEO_PROVIDER_HOST}
            />
            {ctx.role !== 'assistant' && (
              <AvailabilityManager slots={slots.data ?? []} video={ready.video} />
            )}
          </>
        );
        break;
      }
      case 'aufgaben': {
        const { data } = await ctx.client
          .from('tasks')
          .select('*')
          .is('completed_at', null)
          .order('due_at')
          .limit(300);
        body = (
          <>
            <h1>Aufgaben & Fristen</h1>
            <p>
              Offene Einträge aus freigegebenen Akten, nach Fälligkeit sortiert. Fristenkontrolle
              bleibt eine persönliche Kanzleiaufgabe.
            </p>
            <TaskManager tasks={data ?? []} />
          </>
        );
        break;
      }
      case 'rechnungen': {
        const { data } = await ctx.client
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        body = (
          <>
            <h1>Rechnungen & Zahlungsstand</h1>
            <p>
              Neue Zahlungsanforderungen werden direkt in der angenommenen Akte angelegt.
              Formgerechte Rechnungsdokumente werden der Akte beigefügt.
            </p>
            <InvoiceList
              invoices={data ?? []}
              payments={ready.payments}
              staff
              terms={firm.mandateTerms}
              cancellation={firm.cancellationText}
            />
          </>
        );
        break;
      }
      case 'einstellungen': {
        if (!admin) notFound();
        body = (
          <>
            <h1>Kanzlei & Inhalte</h1>
            <p>
              Geprüfte Kanzleidaten, Berufsträger, Gebühren und Pflichttexte. Texte werden als
              Klartext veröffentlicht; HTML wird nicht ausgeführt.
            </p>
            <FirmEditor initial={firm} />
            <section className="section-panel">
              <h2>Seiteninhalte & häufige Fragen</h2>
              <ContentEditor initial={await getContent()} />
            </section>
          </>
        );
        break;
      }
      case 'mitarbeiter': {
        if (!admin) notFound();
        const { data } = await ctx.client.from('staff_members').select('*');
        body = (
          <>
            <h1>Mitarbeiter & Rollen</h1>
            <p>Kontozugänge, Rollen und Entzug von Berechtigungen verwalten.</p>
            <StaffManager members={data ?? []} />
          </>
        );
        break;
      }
      case 'datenschutz': {
        if (!admin) notFound();
        const { data } = await ctx.client
          .from('privacy_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        body = (
          <>
            <h1>Datenschutzanfragen</h1>
            <p>Auskunft und Löschung fristgerecht prüfen und die Entscheidung dokumentieren.</p>
            <PrivacyManager requests={data ?? []} />
          </>
        );
        break;
      }
      case 'audit': {
        if (!admin) notFound();
        const { data } = await ctx.client
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        body = (
          <>
            <h1>Auditprotokoll</h1>
            <p>
              Die letzten 200 protokollierten Zugriffe und Änderungen. Das Protokoll enthält keine
              Sachverhalte oder Nachrichteninhalte.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Zeit (Berlin)</th>
                    <th>Akteur</th>
                    <th>Aktion</th>
                    <th>Objekt</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {new Date(a.created_at).toLocaleString('de-DE', {
                          timeZone: 'Europe/Berlin',
                        })}
                      </td>
                      <td>{a.actor_id || 'System'}</td>
                      <td>{a.action}</td>
                      <td>
                        {a.entity_type} · {a.entity_id || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
        break;
      }
      default:
        notFound();
    }
  return (
    <div className="container portal-layout">
      <PortalNav staff admin={admin} />
      <div className="portal-main">{body}</div>
    </div>
  );
}
import { ContentEditor } from '@/components/content-editor';
import { getContent } from '@/lib/cms';
