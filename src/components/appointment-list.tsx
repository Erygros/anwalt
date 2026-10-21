'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post, formatDate, formatTime } from '@/lib/client-api';
import { statusLabels } from '@/lib/validation';
import type { Appointment } from '@/lib/types';
export function AppointmentList({
  appointments,
  staff = false,
  videoHost,
}: {
  appointments: Appointment[];
  staff?: boolean;
  videoHost?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  async function cancel(id: string) {
    setBusy(true);
    setError('');
    try {
      await post('appointments/cancel', { id });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {appointments.length ? (
        <ul className="data-list">
          {appointments.map((a) => (
            <li key={a.id}>
              <div className="meta-row">
                <div>
                  <h3>
                    {a.availability_slots
                      ? `${formatDate(a.availability_slots.starts_at)} · ${formatTime(a.availability_slots.starts_at)}–${formatTime(a.availability_slots.ends_at)} Uhr`
                      : 'Terminzeit nicht verfügbar'}
                  </h3>
                  <p>
                    {a.mode === 'video' ? 'Videoberatung' : 'Telefonberatung'} ·{' '}
                    {statusLabels[a.status]} · Europe/Berlin
                  </p>
                  {staff && <p>Mandanten-ID: {a.client_id}</p>}
                </div>
                <span className="badge">{statusLabels[a.status]}</span>
              </div>
              {a.status === 'booked' &&
                a.availability_slots &&
                new Date(a.availability_slots.starts_at) > new Date() && (
                  <div className="form-actions">
                    {a.video_url && a.mode === 'video' ? (
                      <a
                        className="small-button"
                        href={a.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Videotermin öffnen ↗
                      </a>
                    ) : a.mode === 'video' ? (
                      <p>Der Zugangslink wird vor dem Termin durch die Kanzlei bereitgestellt.</p>
                    ) : (
                      <p>
                        Die Kanzlei meldet sich zur vereinbarten Zeit unter Ihrer hinterlegten
                        Telefonnummer.
                      </p>
                    )}
                    {!staff && (
                      <Link className="small-button" href={`/termin?umbuchen=${a.id}`}>
                        Umbuchen
                      </Link>
                    )}
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() => void cancel(a.id)}
                    >
                      Termin stornieren
                    </button>
                  </div>
                )}
              {staff && a.mode === 'video' && a.status === 'booked' && (
                <form
                  className="form-actions"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError('');
                    try {
                      await post('admin', {
                        action: 'video-link',
                        payload: { id: a.id, url: link },
                      });
                      setLink('');
                      router.refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="form-field" style={{ flex: 1, margin: 0 }}>
                    <label htmlFor={`video-${a.id}`}>
                      Videolink ({videoHost || 'kein Anbieter freigegeben'})
                    </label>
                    <input
                      id={`video-${a.id}`}
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      required
                    />
                  </div>
                  <button className="small-button" disabled={busy || !videoHost}>
                    Link speichern
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h3>Noch keine Termine.</h3>
          <p>Hier erscheinen Ihre gebuchten Telefon- und Videotermine.</p>
          {!staff && (
            <Link href="/termin" className="button">
              Verfügbare Termine ansehen
            </Link>
          )}
        </div>
      )}
    </>
  );
}
