'use client';
import { useState } from 'react';
import { post } from '@/lib/client-api';
import type { Profile } from '@/lib/types';
import { browserDb } from '@/lib/supabase/client';
export function ProfileForm({ initial, email }: { initial: Profile; email: string }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const [factor, setFactor] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  async function run(work: () => Promise<unknown>, text: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(text);
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
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      <section className="section-panel">
        <h2>Ihre Kontaktdaten</h2>
        <p>Bestätigte E-Mail-Adresse: {email}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => post('profile', form), 'Kontaktdaten gespeichert.');
          }}
          style={{ marginTop: 20 }}
        >
          {(
            [
              ['full_name', 'Vor- und Nachname'],
              ['phone', 'Telefon'],
              ['company', 'Unternehmen'],
              ['address', 'Anschrift'],
            ] as const
          ).map(([key, title]) => (
            <div className="form-field" key={key}>
              <label htmlFor={key}>{title}</label>
              <input
                id={key}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                maxLength={key === 'address' ? 700 : 180}
                required={key === 'full_name'}
              />
            </div>
          ))}
          <button className="button" disabled={busy}>
            Stammdaten speichern
          </button>
        </form>
      </section>
      <section className="section-panel">
        <h2>Anmeldesicherheit</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await browserDb().auth.updateUser({ password });
              if (error)
                throw new Error(
                  'Bitte melden Sie sich erneut an und versuchen Sie die Änderung noch einmal.',
                );
              setPassword('');
            }, 'Passwort geändert.');
          }}
        >
          <div className="form-field">
            <label htmlFor="new-password">Neues Passwort</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="small-button" disabled={busy}>
            Passwort ändern
          </button>
        </form>
        <h3>Zwei-Faktor-Authentifizierung</h3>
        <p>Schützen Sie den Zugang zusätzlich mit einer Authenticator-App.</p>
        {!factor ? (
          <button
            className="small-button"
            style={{ marginTop: 16 }}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const supa = browserDb();
                const { data: list } = await supa.auth.mfa.listFactors();
                if (list?.totp.some((f) => f.status === 'verified'))
                  throw new Error('Für dieses Konto ist bereits ein zweiter Faktor eingerichtet.');
                for (const f of list?.totp ?? []) await supa.auth.mfa.unenroll({ factorId: f.id });
                const { data, error } = await supa.auth.mfa.enroll({
                  factorType: 'totp',
                  friendlyName: 'Mandantenzugang',
                });
                if (error) throw new Error('Die Einrichtung konnte nicht gestartet werden.');
                setQr(data.totp.qr_code);
                setFactor(data.id);
              }, 'Scannen Sie den QR-Code und bestätigen Sie den aktuellen Code.')
            }
          >
            Zweiten Faktor einrichten
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const { error } = await browserDb().auth.mfa.challengeAndVerify({
                  factorId: factor,
                  code,
                });
                if (error) throw new Error('Der Code konnte nicht bestätigt werden.');
                setQr('');
                setFactor('');
              }, 'Zweiter Faktor aktiviert.');
            }}
          >
            {qr && (
              <img src={qr} alt="QR-Code für Ihre Authenticator-App" width={200} height={200} />
            )}
            <div className="form-field">
              <label htmlFor="mfa-code">Aktueller sechsstelliger Code</label>
              <input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button className="small-button" disabled={busy}>
              Code bestätigen
            </button>
          </form>
        )}
      </section>
      <section className="section-panel">
        <h2>Ihre Daten & Rechte</h2>
        <p>
          Ein Datenexport enthält die für Sie freigegebenen Einträge. Dokumente können Sie
          zusätzlich aus der jeweiligen Akte herunterladen. Löschanfragen werden auf bestehende
          Aufbewahrungspflichten geprüft.
        </p>
        <div className="form-actions">
          <a className="small-button" href="/api/export">
            Meine Daten exportieren (JSON)
          </a>
          <button
            className="small-button"
            disabled={busy}
            onClick={() =>
              void run(
                () => post('privacy', { kind: 'access' }),
                'Ihre Auskunftsanfrage wurde gespeichert.',
              )
            }
          >
            Auskunft anfordern
          </button>
          <button
            className="small-button"
            disabled={busy}
            onClick={() =>
              void run(
                () => post('privacy', { kind: 'erasure' }),
                'Ihre Löschanfrage wurde gespeichert. Die Kanzlei prüft mögliche Aufbewahrungspflichten.',
              )
            }
          >
            Löschung anfragen
          </button>
        </div>
      </section>
    </>
  );
}
