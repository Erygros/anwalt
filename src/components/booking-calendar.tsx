'use client';
import { useState } from 'react';
import Link from 'next/link';
import { post, formatDate, formatTime } from '@/lib/client-api';
import type { Slot } from '@/lib/types';
export function BookingCalendar({
  slots,
  live,
  authenticated,
  replaceId,
}: {
  slots: Slot[];
  live: boolean;
  authenticated: boolean;
  replaceId?: string;
}) {
  const dayKey = (s: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(s));
  const days = Array.from(new Set(slots.map((s) => dayKey(s.starts_at))));
  const [day, setDay] = useState(days[0] || '');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const chosen = slots.find((s) => s.id === slot);
  const dateLabel = (key: string) =>
    new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'Europe/Berlin',
    }).format(new Date(`${key}T12:00:00Z`));
  if (success)
    return (
      <div className="form-card">
        <h2>{replaceId ? 'Ihr Termin wurde umgebucht.' : 'Ihr Termin ist gebucht.'}</h2>
        <p>
          Die aktuellen Daten und Verwaltungsmöglichkeiten stehen in Ihrem Mandantenbereich. Eine
          Terminbestätigung wird ohne vertrauliche Falldetails versendet.
        </p>
        <Link className="button" href="/portal/termine">
          Meine Termine öffnen
        </Link>
      </div>
    );
  return (
    <div className="form-card">
      <h2>{replaceId ? 'Einen anderen Termin wählen.' : 'Wann passt es Ihnen?'}</h2>
      <p>Alle Zeiten in Europe/Berlin. Freigegebene Termine in den nächsten sechs Wochen.</p>
      {!live ? (
        <div className="notice">Die Terminbuchung ist noch nicht freigeschaltet.</div>
      ) : !slots.length ? (
        <div className="empty-state">
          <h3>Aktuell keine freien Termine.</h3>
          <p>
            Die Kanzlei hat derzeit keine buchbaren Zeitfenster veröffentlicht. Sie können Ihr
            Anliegen über die Mandatsanfrage schildern.
          </p>
          <Link className="button" href="/anfrage">
            Anliegen schildern
          </Link>
        </div>
      ) : (
        <>
          <h3 style={{ fontSize: 13, marginTop: 22 }}>Verfügbare Tage</h3>
          <div className="day-grid">
            {days.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => {
                  setDay(d);
                  setSlot('');
                }}
                className={day === d ? 'selected' : ''}
                aria-pressed={day === d}
              >
                {dateLabel(d)}
              </button>
            ))}
          </div>
          <h3 style={{ fontSize: 13 }}>Uhrzeit auswählen</h3>
          <div className="slot-grid">
            {slots
              .filter((s) => dayKey(s.starts_at) === day)
              .map((s) => (
                <button
                  type="button"
                  className={`small-button ${slot === s.id ? 'selected' : ''}`}
                  key={s.id}
                  aria-pressed={slot === s.id}
                  onClick={() => {
                    setSlot(s.id);
                    setMode(s.modes[0]);
                  }}
                >
                  {formatTime(s.starts_at)}–{formatTime(s.ends_at)}
                </button>
              ))}
          </div>
          {chosen && (
            <>
              <div className="form-field">
                <label htmlFor="booking-mode">Beratungsart</label>
                <select id="booking-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                  {chosen.modes.map((m) => (
                    <option key={m} value={m}>
                      {m === 'video' ? 'Videoberatung' : 'Telefonberatung'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="notice">
                <strong>
                  {formatDate(chosen.starts_at)} · {formatTime(chosen.starts_at)} Uhr
                </strong>
                <p>
                  {mode === 'phone'
                    ? 'Bitte hinterlegen Sie Ihre Telefonnummer in den Stammdaten.'
                    : 'Den Zugangslink stellt die Kanzlei vor dem Termin im Mandantenbereich bereit.'}{' '}
                  Eine Buchung begründet kein Mandat und löst keine Zahlung aus. Umfang und
                  gegebenenfalls anfallende Kosten werden vor einer Beauftragung geklärt.
                </p>
              </div>
              {authenticated ? (
                <button
                  className="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await post('appointments', {
                        slotId: slot,
                        mode,
                        replaceId: replaceId || null,
                      });
                      setSuccess(true);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? 'Termin wird reserviert …'
                    : replaceId
                      ? 'Verbindlich umbuchen'
                      : 'Termin verbindlich reservieren'}
                </button>
              ) : (
                <div className="notice">
                  <p>
                    Bitte melden Sie sich mit einer bestätigten E-Mail-Adresse an, um einen Termin
                    zu reservieren.
                  </p>
                  <Link className="button" style={{ marginTop: 15 }} href="/mandantenbereich">
                    Zum Mandantenlogin
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
