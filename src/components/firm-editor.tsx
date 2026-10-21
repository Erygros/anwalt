'use client';
import { useState } from 'react';
import { post } from '@/lib/client-api';
import type { Firm } from '@/lib/firm';
import { isFirmComplete } from '@/lib/firm';
const groups: Record<string, [keyof Firm, string][]> = {
  Kanzlei: [
    ['brand', 'Projekt- / Markenname'],
    ['legalName', 'Vollständiger Kanzleiname / Diensteanbieter'],
    ['address', 'Vollständige Anschrift'],
    ['email', 'Kontakt-E-Mail'],
    ['phone', 'Telefon'],
    ['responsible', 'Verantwortlicher Berufsträger'],
    ['about', 'Vorstellung der Kanzlei'],
  ],
  Berufsrecht: [
    ['professionalTitle', 'Gesetzliche Berufsbezeichnung'],
    ['countryOfAdmission', 'Staat der Verleihung / Zulassung'],
    ['chamber', 'Zuständige Kammer samt Anschrift'],
    ['register', 'Register und Registernummer (falls vorhanden)'],
    ['vatId', 'Umsatzsteuer-ID (falls vorhanden)'],
    ['insurance', 'Berufshaftpflicht: Versicherer und Anschrift'],
    ['insuranceTerritory', 'Räumlicher Geltungsbereich'],
  ],
  Pflichttexte: [
    ['imprintText', 'Vollständiger geprüfter Impressumstext'],
    ['privacyText', 'Vollständige geprüfte Datenschutzerklärung'],
    ['mandateTerms', 'Mandatsbedingungen / Vertragsinformationen'],
    ['cancellationText', 'Widerrufsbelehrung und Muster-Widerrufsformular'],
    ['feeText', 'Hinweise zur Vergütung'],
    ['privacyReviewedAt', 'Datenschutzrechtlich geprüft am (Datum / Version)'],
    ['legalReviewedAt', 'Berufs- und vertragsrechtlich geprüft am (Datum / Version)'],
  ],
};
export function FirmEditor({ initial }: { initial: Firm }) {
  const [firm, setFirm] = useState(initial);
  const [tab, setTab] = useState('Kanzlei');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await post('admin', { action: 'firm', payload: firm });
      setMessage(
        'Kanzleidaten veröffentlicht. Der Livebetrieb setzt zusätzlich FIRM_LIVE=true und vollständige Dienste voraus.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <div className="notice">
        {isFirmComplete(firm)
          ? 'Die erforderlichen Stammdaten sind ausgefüllt. Inhaltliche Richtigkeit und Zulassung müssen durch die Kanzlei bestätigt werden.'
          : 'Pflichtangaben fehlen noch. Der Beratungsbetrieb bleibt gesperrt.'}{' '}
        Keine Namen, Titel oder Gebühren veröffentlichen, die nicht von der Kanzlei bestätigt sind.
      </div>
      <div className="auth-tabs" role="tablist" style={{ flexWrap: 'wrap' }}>
        {[...Object.keys(groups), 'Berufsträger', 'Leistungen'].map((t) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      {groups[tab]?.map(([key, label]) => (
        <div className="form-field" key={key}>
          <label htmlFor={`firm-${key}`}>{label}</label>
          {[
            'about',
            'address',
            'chamber',
            'insurance',
            'imprintText',
            'privacyText',
            'mandateTerms',
            'cancellationText',
            'feeText',
          ].includes(key) ? (
            <textarea
              id={`firm-${key}`}
              value={String(firm[key])}
              style={{
                minHeight:
                  key.endsWith('Text') || ['mandateTerms', 'cancellationText'].includes(key)
                    ? 260
                    : 100,
              }}
              maxLength={60000}
              onChange={(e) => setFirm({ ...firm, [key]: e.target.value })}
            />
          ) : (
            <input
              id={`firm-${key}`}
              value={String(firm[key])}
              type={key === 'email' ? 'email' : 'text'}
              onChange={(e) => setFirm({ ...firm, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
      {tab === 'Berufsträger' && (
        <>
          {firm.lawyers.map((l, i) => (
            <section className="section-panel" key={i}>
              <div className="form-field">
                <label htmlFor={`lawyer-name-${i}`}>Name</label>
                <input
                  id={`lawyer-name-${i}`}
                  value={l.name}
                  required
                  onChange={(e) =>
                    setFirm({
                      ...firm,
                      lawyers: firm.lawyers.map((x, n) =>
                        n === i ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor={`lawyer-title-${i}`}>
                  Verifizierte Berufsbezeichnung (Fachanwaltstitel nur bei Berechtigung)
                </label>
                <input
                  id={`lawyer-title-${i}`}
                  value={l.title}
                  required
                  onChange={(e) =>
                    setFirm({
                      ...firm,
                      lawyers: firm.lawyers.map((x, n) =>
                        n === i ? { ...x, title: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor={`lawyer-bio-${i}`}>Vorstellung</label>
                <textarea
                  id={`lawyer-bio-${i}`}
                  value={l.bio}
                  onChange={(e) =>
                    setFirm({
                      ...firm,
                      lawyers: firm.lawyers.map((x, n) =>
                        n === i ? { ...x, bio: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <button
                className="small-button"
                type="button"
                onClick={() =>
                  setFirm({ ...firm, lawyers: firm.lawyers.filter((_, n) => n !== i) })
                }
              >
                Profil entfernen
              </button>
            </section>
          ))}
          <button
            className="small-button"
            type="button"
            onClick={() =>
              setFirm({ ...firm, lawyers: [...firm.lawyers, { name: '', title: '', bio: '' }] })
            }
          >
            Bestätigten Berufsträger hinzufügen
          </button>
        </>
      )}
      {tab === 'Leistungen' && (
        <>
          <div className="notice">
            Gesamtpreise in Cent inklusive Umsatzsteuer. Diese Preise erscheinen öffentlich und
            werden für neue Zahlungsanforderungen verwendet. Bereits angelegte Beträge bleiben
            erhalten.
          </div>
          {firm.services.map((s, i) => (
            <section className="section-panel" key={i}>
              {(
                [
                  ['id', 'Interne Leistungskennung (klein, ohne Leerzeichen)'],
                  ['title', 'Leistungsbezeichnung'],
                  ['description', 'Konkrete Leistungsbeschreibung'],
                ] as const
              ).map(([key, label]) => (
                <div className="form-field" key={key}>
                  <label htmlFor={`service-${i}-${key}`}>{label}</label>
                  <input
                    id={`service-${i}-${key}`}
                    value={s[key]}
                    required
                    onChange={(e) =>
                      setFirm({
                        ...firm,
                        services: firm.services.map((x, n) =>
                          n === i ? { ...x, [key]: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor={`amount-${i}`}>Gesamtpreis in Cent</label>
                  <input
                    id={`amount-${i}`}
                    type="number"
                    min={1}
                    max={10000000}
                    value={s.amount}
                    required
                    onChange={(e) =>
                      setFirm({
                        ...firm,
                        services: firm.services.map((x, n) =>
                          n === i ? { ...x, amount: Number(e.target.value) } : x,
                        ),
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label htmlFor={`tax-${i}`}>Umsatzsteuer in %</label>
                  <input
                    id={`tax-${i}`}
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={s.taxRate}
                    required
                    onChange={(e) =>
                      setFirm({
                        ...firm,
                        services: firm.services.map((x, n) =>
                          n === i ? { ...x, taxRate: Number(e.target.value) } : x,
                        ),
                      })
                    }
                  />
                </div>
              </div>
              <button
                className="small-button"
                type="button"
                onClick={() =>
                  setFirm({ ...firm, services: firm.services.filter((_, n) => n !== i) })
                }
              >
                Leistung entfernen
              </button>
            </section>
          ))}
          <button
            type="button"
            className="small-button"
            onClick={() =>
              setFirm({
                ...firm,
                services: [
                  ...firm.services,
                  { id: '', title: '', description: '', amount: 0, taxRate: 19 },
                ],
              })
            }
          >
            Leistung hinzufügen
          </button>
        </>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Wird gespeichert …' : 'Kanzleidaten veröffentlichen'}
        </button>
      </div>
    </form>
  );
}
