'use client';
import { useState, useEffect } from 'react';
import { browserDb } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
export function AuthForm({ configured, reset = false }: { configured: boolean; reset?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(reset ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factor, setFactor] = useState('');
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(reset);
  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = browserDb().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, [configured]);
  async function afterLogin() {
    const response = await fetch('/api/session');
    const s = await response.json();
    if (s.mfaRequired) {
      const supa = browserDb();
      const { data } = await supa.auth.mfa.listFactors();
      const existing = data?.totp.find((f) => f.status === 'verified');
      if (existing) setFactor(existing.id);
      else {
        for (const old of data?.totp ?? []) await supa.auth.mfa.unenroll({ factorId: old.id });
        const { data: enrolled, error } = await supa.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Kanzleizugang',
        });
        if (error) throw error;
        setFactor(enrolled.id);
        setQr(enrolled.totp.qr_code);
      }
      setNotice('Ihr Zugang benötigt den Code Ihrer Authenticator-App.');
      return;
    }
    router.push(s.staff ? '/admin' : '/portal');
    router.refresh();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const supa = browserDb();
      if (factor) {
        const { error } = await supa.auth.mfa.challengeAndVerify({ factorId: factor, code });
        if (error) throw error;
        await afterLogin();
      } else if (recovery) {
        const { error } = await supa.auth.updateUser({ password });
        if (error) throw error;
        setNotice('Ihr Passwort wurde geändert.');
        setRecovery(false);
        setMode('login');
      } else if (mode === 'register') {
        const { error } = await supa.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setNotice(
          'Falls ein neues Konto angelegt werden kann, erhalten Sie eine E-Mail zur Bestätigung. Öffnen Sie den Link und melden Sie sich anschließend an.',
        );
      } else if (mode === 'reset') {
        const { error } = await supa.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/mandantenbereich?reset=1`,
        });
        if (error) throw error;
        setNotice(
          'Falls ein Konto besteht, erhalten Sie eine E-Mail zum Zurücksetzen des Passworts.',
        );
      } else {
        const { error } = await supa.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await afterLogin();
      }
    } catch {
      setError(
        factor
          ? 'Der Sicherheitscode konnte nicht bestätigt werden. Bitte einen aktuellen Code eingeben.'
          : 'Die Anmeldung konnte nicht abgeschlossen werden. Bitte prüfen Sie Ihre Angaben und die E-Mail-Bestätigung.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-card">
      {!factor && !recovery && (
        <div className="auth-tabs" role="tablist" aria-label="Anmeldung">
          <button role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>
            Anmelden
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => setMode('register')}
          >
            Konto erstellen
          </button>
        </div>
      )}
      <h2>
        {factor
          ? 'Zweiter Faktor'
          : recovery
            ? 'Neues Passwort'
            : mode === 'register'
              ? 'Ihr geschützter Zugang.'
              : mode === 'reset'
                ? 'Passwort zurücksetzen.'
                : 'Willkommen zurück.'}
      </h2>
      <p>
        {factor
          ? 'Geben Sie den sechsstelligen Code Ihrer Authenticator-App ein.'
          : mode === 'register'
            ? 'Nach der Registrierung bestätigen Sie Ihre E-Mail-Adresse.'
            : 'Melden Sie sich mit Ihrer bestätigten E-Mail-Adresse an.'}
      </p>
      {!configured && (
        <div className="notice">
          Der Mandantenbereich ist noch nicht eingerichtet. Eine Anmeldung ist derzeit nicht
          möglich.
        </div>
      )}
      <form onSubmit={submit}>
        {factor ? (
          <>
            {qr && (
              <div>
                <p>
                  Scannen Sie diesen QR-Code mit Ihrer Authenticator-App. Bewahren Sie den Zugang zu
                  Ihrer App sicher auf.
                </p>
                {/* Supabase returns a self-contained SVG QR code. */}
                <img
                  src={qr}
                  width={200}
                  height={200}
                  alt="QR-Code zur Einrichtung des zweiten Faktors"
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="totp">Sicherheitscode</label>
              <input
                id="totp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
              />
            </div>
          </>
        ) : (
          <>
            {!recovery && (
              <div className="form-field">
                <label htmlFor="email">E-Mail-Adresse</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={250}
                />
              </div>
            )}
            {(mode !== 'reset' || recovery) && (
              <div className="form-field">
                <label htmlFor="password">{recovery ? 'Neues Passwort' : 'Passwort'}</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === 'register' || recovery ? 'new-password' : 'current-password'
                  }
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <small>Mindestens 12 Zeichen.</small>
              </div>
            )}
          </>
        )}
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
        <button type="submit" className="button" disabled={!configured || busy}>
          {busy
            ? 'Wird geprüft …'
            : factor
              ? 'Code bestätigen'
              : recovery
                ? 'Passwort speichern'
                : mode === 'register'
                  ? 'Konto erstellen'
                  : mode === 'reset'
                    ? 'Link anfordern'
                    : 'Sicher anmelden'}
        </button>
      </form>
      {!factor && !recovery && mode === 'login' && (
        <button
          className="text-link"
          style={{ border: 0, background: 'none', marginTop: 16 }}
          onClick={() => setMode('reset')}
        >
          Passwort vergessen?
        </button>
      )}
      <p className="privacy-meta">
        Zwei-Faktor-Authentifizierung kann im Mandantenbereich eingerichtet werden. Für
        Mitarbeitende ist sie verpflichtend.
      </p>
    </div>
  );
}
