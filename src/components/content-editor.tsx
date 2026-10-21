'use client';
import { useState } from 'react';
import type { SiteContent } from '@/lib/cms-schema';
import { post } from '@/lib/client-api';
export function ContentEditor({ initial }: { initial: SiteContent }) {
  const [content, setContent] = useState(initial);
  const [tab, setTab] = useState('start');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const current = content.practices.find((p) => p.slug === tab);
  function updatePractice(key: string, value: unknown) {
    setContent({
      ...content,
      practices: content.practices.map((p) => (p.slug === tab ? { ...p, [key]: value } : p)),
    });
  }
  const activeFaq = current ? current.faq : content.faq;
  function faqChange(items: [string, string][]) {
    if (current) updatePractice('faq', items);
    else setContent({ ...content, faq: items });
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        try {
          await post('admin', { action: 'content', payload: content });
          setNotice('Seiteninhalte veröffentlicht.');
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="auth-tabs" role="tablist" style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'start'}
          onClick={() => setTab('start')}
        >
          Startseite & FAQ
        </button>
        {content.practices.map((p) => (
          <button
            type="button"
            key={p.slug}
            role="tab"
            aria-selected={tab === p.slug}
            onClick={() => setTab(p.slug)}
          >
            {p.title}
          </button>
        ))}
      </div>
      {tab === 'start' ? (
        <>
          {content.heroLines.map((line, i) => (
            <div className="form-field" key={i}>
              <label htmlFor={`hero-${i}`}>Hero-Überschrift · Zeile {i + 1}</label>
              <input
                id={`hero-${i}`}
                value={line}
                maxLength={80}
                onChange={(e) => {
                  const heroLines = [...content.heroLines] as [string, string, string];
                  heroLines[i] = e.target.value;
                  setContent({ ...content, heroLines });
                }}
              />
            </div>
          ))}
          <div className="form-field">
            <label htmlFor="hero-intro">Hero-Einleitung</label>
            <textarea
              id="hero-intro"
              value={content.heroIntro}
              onChange={(e) => setContent({ ...content, heroIntro: e.target.value })}
            />
          </div>
        </>
      ) : (
        current && (
          <>
            {(
              [
                ['title', 'Bezeichnung'],
                ['tag', 'Kurzzeile'],
                ['description', 'Beschreibung in der Übersicht'],
                ['lead', 'Überschrift der Unterseite'],
                ['intro', 'Einleitung'],
                ['support', 'Anwaltliche Unterstützung'],
                ['prepare', 'Benötigte Unterlagen'],
              ] as const
            ).map(([key, label]) => (
              <div className="form-field" key={key}>
                <label htmlFor={`content-${key}`}>{label}</label>
                <textarea
                  id={`content-${key}`}
                  value={current[key]}
                  onChange={(e) => updatePractice(key, e.target.value)}
                />
              </div>
            ))}
            {(
              [
                ['topics', 'Leistungsschwerpunkte – eine Zeile je Eintrag'],
                ['problems', 'Typische Anliegen – eine Zeile je Eintrag'],
              ] as const
            ).map(([key, label]) => (
              <div className="form-field" key={key}>
                <label htmlFor={`content-${key}`}>{label}</label>
                <textarea
                  id={`content-${key}`}
                  value={current[key].join('\n')}
                  onChange={(e) => updatePractice(key, e.target.value.split('\n'))}
                />
              </div>
            ))}
          </>
        )
      )}
      <h3 style={{ margin: '28px 0 20px' }}>Fragen & Antworten</h3>
      {activeFaq.map(([q, a], i) => (
        <section className="section-panel" key={i}>
          <div className="form-field">
            <label htmlFor={`faq-q-${i}`}>Frage</label>
            <input
              id={`faq-q-${i}`}
              value={q}
              onChange={(e) =>
                faqChange(activeFaq.map((f, n) => (n === i ? [e.target.value, f[1]] : f)))
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor={`faq-a-${i}`}>Antwort</label>
            <textarea
              id={`faq-a-${i}`}
              value={a}
              onChange={(e) =>
                faqChange(activeFaq.map((f, n) => (n === i ? [f[0], e.target.value] : f)))
              }
            />
          </div>
          <button
            className="small-button"
            type="button"
            onClick={() => faqChange(activeFaq.filter((_, n) => n !== i))}
          >
            Frage entfernen
          </button>
        </section>
      ))}
      <button
        type="button"
        className="small-button"
        onClick={() => faqChange([...activeFaq, ['', '']])}
      >
        Frage hinzufügen
      </button>
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
      <div className="form-actions">
        <button className="button" disabled={busy}>
          Seiteninhalte veröffentlichen
        </button>
      </div>
    </form>
  );
}
