'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post, formatDate } from '@/lib/client-api';
import { statusLabels } from '@/lib/validation';
import type { CaseRecord, Message, DocumentRecord, Task } from '@/lib/types';
import type { Firm } from '@/lib/firm';
export function CaseWorkspace({
  record,
  messages,
  documents,
  tasks,
  userId,
  role,
  uploads,
  services,
  events = [],
  members = [],
}: {
  record: CaseRecord;
  messages: Message[];
  documents: DocumentRecord[];
  tasks: Task[];
  userId: string;
  role?: string;
  uploads: boolean;
  services: Firm['services'];
  events?: { id: string; status: string; created_at: string }[];
  members?: { user_id: string; role: string; assigned: boolean }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [task, setTask] = useState({ title: '', dueAt: '', kind: 'task' });
  const [invoice, setInvoice] = useState({ number: '', serviceId: '' });
  const [until, setUntil] = useState(record.retention_until || '');
  const [hold, setHold] = useState(record.legal_hold);
  async function run(work: () => Promise<unknown>, message = 'Gespeichert.') {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await work();
      setSuccess(message);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const action = (action: string, payload: unknown) =>
    run(() => post('admin', { action, payload }));
  return (
    <>
      <Link className="back-link" href={role ? '/admin/akten' : '/portal/akten'}>
        ← Zur Aktenübersicht
      </Link>
      <div className="meta-row">
        <div>
          <p className="eyebrow">{record.reference}</p>
          <h1 style={{ fontSize: 42 }}>{record.subject || 'Anfrageentwurf'}</h1>
        </div>
        <span className={`badge ${record.status !== 'accepted' ? 'pending' : ''}`}>
          {statusLabels[record.status]}
        </span>
      </div>
      <p style={{ marginTop: 15, fontSize: 12 }}>
        Rechtsgebiet: {record.practice} · Erstellt am {formatDate(record.created_at)}
      </p>
      {record.status === 'draft' && (
        <div className="notice">
          Dieser Entwurf wurde nicht an die Kanzlei übermittelt.{' '}
          <Link href="/anfrage">Eine neue vollständige Anfrage beginnen.</Link>
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          {success}
        </div>
      )}
      {role && (
        <section className="section-panel">
          <h2>Eingangs- und Mandatsprüfung</h2>
          <p>
            Die Konfliktprüfung erfolgt durch einen befugten Berufsträger anhand der beteiligten
            Personen und der Kanzleiakten.
          </p>
          <p style={{ fontSize: 12, marginTop: 10 }}>
            Ergebnis:{' '}
            {record.conflict_result === 'clear'
              ? 'Kein Konflikt festgestellt'
              : record.conflict_result === 'conflict'
                ? 'Interessenkonflikt festgestellt'
                : 'Noch nicht geprüft'}
            {record.conflict_checked_at && ` · ${formatDate(record.conflict_checked_at)}`}
          </p>
          {role !== 'assistant' && (
            <div className="form-actions">
              {['submitted', 'conflict_review'].includes(record.status) && (
                <>
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => action('conflict', { caseId: record.id, result: 'clear' })}
                  >
                    Prüfung: kein Konflikt
                  </button>
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => action('conflict', { caseId: record.id, result: 'conflict' })}
                  >
                    Prüfung: Konflikt
                  </button>
                  <button
                    className="button"
                    disabled={busy || record.conflict_result !== 'clear'}
                    onClick={() => action('status', { caseId: record.id, status: 'accepted' })}
                  >
                    Mandat annehmen
                  </button>
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => action('status', { caseId: record.id, status: 'declined' })}
                  >
                    Anfrage ablehnen
                  </button>
                </>
              )}
              {record.status === 'accepted' && (
                <button
                  className="small-button"
                  disabled={busy}
                  onClick={() => action('status', { caseId: record.id, status: 'closed' })}
                >
                  Mandat abschließen
                </button>
              )}
            </div>
          )}
        </section>
      )}
      <section className="section-panel">
        <h2>Bearbeitungsverlauf</h2>
        {events.length ? (
          <ol className="data-list">
            {events.map((e) => (
              <li key={e.id}>
                <h3>{statusLabels[e.status] || e.status}</h3>
                <p>{formatDate(e.created_at)}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>Die Bearbeitung beginnt nach dem Übermitteln Ihrer Anfrage.</p>
        )}
      </section>
      <section className="section-panel">
        <h2>Die übermittelte Situation</h2>
        <dl className="summary-list">
          <dt>Sachverhalt</dt>
          <dd>{record.facts || 'Noch nicht übermittelt'}</dd>
          <dt>Beteiligte</dt>
          <dd>{record.opponent || 'Noch nicht übermittelt'}</dd>
          <dt>Bekannte Frist</dt>
          <dd>{record.deadline || 'Keine angegeben'}</dd>
          <dt>Dringlichkeit</dt>
          <dd>{record.urgency}</dd>
        </dl>
      </section>
      <section className="section-panel">
        <h2>Nachrichten {role ? '& interne Notizen' : ''}</h2>
        {messages.length ? (
          messages.map((m) => (
            <article className={`message-bubble ${m.sender_id === userId ? 'own' : ''}`} key={m.id}>
              <small>
                {m.internal ? 'INTERNE NOTIZ · ' : ''}
                {m.sender_id === userId ? 'Sie' : 'Ansprechpartner'} · {formatDate(m.created_at)}
              </small>
              <p>{m.body}</p>
            </article>
          ))
        ) : (
          <p>Zu dieser Akte gibt es noch keine Nachrichten.</p>
        )}
        {!['draft', 'declined', 'closed'].includes(record.status) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await post('messages', { caseId: record.id, body, internal });
                setBody('');
              }, 'Nachricht gespeichert.');
            }}
          >
            <div className="form-field" style={{ marginTop: 25 }}>
              <label htmlFor="message">{internal ? 'Interne Notiz' : 'Ihre Nachricht'}</label>
              <textarea
                id="message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                minLength={1}
                maxLength={10000}
              />
            </div>
            {role && (
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />
                Nur für berechtigte Mitarbeiter sichtbar
              </label>
            )}
            <button className="button" disabled={busy}>
              Nachricht senden
            </button>
          </form>
        )}
      </section>
      <section className="section-panel">
        <h2>Unterlagen</h2>
        {documents.length ? (
          <ul className="file-list">
            {documents.map((d) => (
              <li key={d.id}>
                <span>
                  {d.name}
                  <small style={{ display: 'block', color: '#64717a' }}>
                    {Math.ceil(d.size / 1024)} KB · {formatDate(d.created_at)}
                  </small>
                </span>
                <a className="small-button" href={`/api/documents/download?id=${d.id}`}>
                  Geschützt herunterladen
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>Es wurden noch keine Unterlagen freigegeben.</p>
        )}
        {uploads && !['declined', 'closed'].includes(record.status) ? (
          <div className="file-zone" style={{ marginTop: 20 }}>
            <label htmlFor="case-file">
              Unterlage hinzufügen · PDF, JPG, PNG, TXT · maximal 10 MB
            </label>
            <input
              type="file"
              id="case-file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void run(async () => {
                  const form = new FormData();
                  form.append('file', file);
                  form.append('caseId', record.id);
                  const r = await fetch('/api/documents/upload', { method: 'POST', body: form });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error);
                }, 'Unterlage geprüft und gespeichert.');
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          !uploads && (
            <div className="notice">
              Uploads sind erst nach Anbindung der Sicherheitsprüfung verfügbar.
            </div>
          )
        )}
      </section>
      {role && (
        <section className="section-panel">
          <h2>Aufgaben, Fristen & Wiedervorlagen</h2>
          <ul className="data-list">
            {tasks.map((t) => (
              <li key={t.id}>
                <div className="meta-row">
                  <div>
                    <h3>{t.title}</h3>
                    <p>
                      {t.kind} · {formatDate(t.due_at)} {t.completed_at ? '· Erledigt' : ''}
                    </p>
                  </div>
                  {!t.completed_at && (
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() => action('complete-task', { id: t.id })}
                    >
                      Erledigen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action('task', {
                caseId: record.id,
                ...task,
                dueAt: new Date(task.dueAt).toISOString(),
              });
            }}
          >
            <div className="form-field">
              <label htmlFor="task-title">Aufgabe / Fristbezeichnung</label>
              <input
                id="task-title"
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                minLength={3}
                maxLength={300}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="task-date">Fällig am (lokale Gerätezeit)</label>
                <input
                  id="task-date"
                  type="datetime-local"
                  value={task.dueAt}
                  onChange={(e) => setTask({ ...task, dueAt: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="task-kind">Art</label>
                <select
                  id="task-kind"
                  value={task.kind}
                  onChange={(e) => setTask({ ...task, kind: e.target.value })}
                >
                  <option value="task">Aufgabe</option>
                  <option value="deadline">Frist</option>
                  <option value="followup">Wiedervorlage</option>
                </select>
              </div>
            </div>
            <button className="small-button" disabled={busy}>
              Eintrag anlegen
            </button>
          </form>
        </section>
      )}
      {role && role !== 'assistant' && record.status === 'accepted' && (
        <section className="section-panel">
          <h2>Rechnungsposition anlegen</h2>
          <p>
            Nur hinterlegte Kanzleileistungen können abgerechnet werden. Der Eintrag ist eine
            Zahlungsanforderung; eine formgerechte Rechnung wird zusätzlich zur Akte hochgeladen.
          </p>
          {services.length ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action('invoice', { caseId: record.id, ...invoice });
              }}
            >
              <div className="form-row" style={{ marginTop: 20 }}>
                <div className="form-field">
                  <label htmlFor="invoice-number">Rechnungsnummer</label>
                  <input
                    id="invoice-number"
                    value={invoice.number}
                    onChange={(e) => setInvoice({ ...invoice, number: e.target.value })}
                    required
                    minLength={2}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="invoice-service">Vereinbarte Leistung</label>
                  <select
                    id="invoice-service"
                    value={invoice.serviceId}
                    onChange={(e) => setInvoice({ ...invoice, serviceId: e.target.value })}
                    required
                  >
                    <option value="">Bitte wählen</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} · {(s.amount / 100).toFixed(2)} €
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="small-button" disabled={busy}>
                Zahlungsanforderung speichern
              </button>
            </form>
          ) : (
            <div className="notice">
              Zuerst Leistungen und Gebühren in den Kanzleieinstellungen hinterlegen.
            </div>
          )}
        </section>
      )}
      {role === 'admin' && (
        <>
          <section className="section-panel">
            <h2>Aktenberechtigungen</h2>
            <p>
              Administratoren haben Zugriff. Weitere Mitarbeiter benötigen eine ausdrückliche
              Freigabe für diese Akte.
            </p>
            <ul className="data-list">
              {members.map((m) => (
                <li key={m.user_id}>
                  <div className="meta-row">
                    <div>
                      <h3>{m.user_id}</h3>
                      <p>{m.role}</p>
                    </div>
                    {m.role === 'admin' ? (
                      <span className="badge">Administration</span>
                    ) : (
                      <button
                        className="small-button"
                        disabled={busy}
                        onClick={() =>
                          action(m.assigned ? 'revoke-member' : 'member', {
                            caseId: record.id,
                            userId: m.user_id,
                          })
                        }
                      >
                        {m.assigned ? 'Zugriff entziehen' : 'Zugriff freigeben'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="section-panel">
            <h2>Aufbewahrung & Löschsperre</h2>
            <p>
              Fristen werden nach individueller Prüfung festgelegt. Ohne festgelegtes Ende oder bei
              Löschsperre erfolgt keine automatische Löschung.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action('retention', { caseId: record.id, until, hold });
              }}
            >
              <div className="form-field" style={{ marginTop: 20 }}>
                <label htmlFor="retention">Aufbewahren bis einschließlich</label>
                <input
                  id="retention"
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  required
                />
              </div>
              <label className="checkbox-line">
                <input type="checkbox" checked={hold} onChange={(e) => setHold(e.target.checked)} />
                Löschsperre setzen (z. B. laufendes Verfahren)
              </label>
              <button className="small-button" disabled={busy}>
                Vorgaben speichern
              </button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
