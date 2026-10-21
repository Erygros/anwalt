import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDown,
  Check,
  Fingerprint,
  MessagesSquare,
  CalendarDays,
  FileCheck2,
  LockKeyhole,
} from 'lucide-react';
import { Button, Eyebrow, FaqList, ContactCta, icons } from '@/components/ui';
import { practices, commonFaq, processSteps } from '@/lib/content';
import { getFirm } from '@/lib/settings';
import { getContent } from '@/lib/cms';
export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };
export default async function Home() {
  const [firm, content] = await Promise.all([getFirm(), getContent()]);
  const { practices, faq: commonFaq } = content;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <Eyebrow>Die digitale Kanzlei für Ihre Rechtsfragen</Eyebrow>
            <h1>
              {content.heroLines[0]}
              <br />
              {content.heroLines[1]}
              <br />
              <em>{content.heroLines[2]}</em>
            </h1>
            <p className="hero-intro">{content.heroIntro}</p>
            <div className="hero-buttons">
              <Button href="/anfrage">Jetzt Rechtsberatung anfragen</Button>
              <Link className="text-link" href="#rechtsgebiete">
                Rechtsgebiete entdecken
                <ArrowDown size={16} />
              </Link>
            </div>
            <p className="hero-footnote">
              <span className="small-dot" />
              Für Privatpersonen und Unternehmen · Bundesweit anfragen
            </p>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="Von Ihrer Anfrage über die persönliche Prüfung zum nächsten Schritt"
          >
            <div className="art-top">
              <span>DER DIGITALE WEG ZU IHREM RECHT</span>
              <Fingerprint size={28} strokeWidth={1} />
            </div>
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="dossier-back" />
            <div className="dossier">
              <div className="dossier-label">
                <span>IHRE ANGELEGENHEIT</span>
                <LockKeyhole size={14} />
              </div>
              <span className="dossier-title">
                Ein Anliegen.
                <br />
                Ein klarer Weg.
              </span>
              <div className="document-line" />
              <div className="document-line short" />
              <div className="dossier-row">
                <span className="dossier-check">
                  <Check size={13} />
                </span>
                <span>Verstehen, worum es geht.</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-check">
                  <Check size={13} />
                </span>
                <span>Möglichkeiten einordnen.</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-check">
                  <Check size={13} />
                </span>
                <span>Den nächsten Schritt kennen.</span>
              </div>
              <div className="dossier-bottom">
                <span>PERSÖNLICH BEGLEITET</span>
                <span className="tiny-brand">d/a</span>
              </div>
            </div>
            <div className="art-caption">
              <span className="caption-rule" />
              Recht braucht Vertrauen.
              <br />
              Auch ohne gemeinsamen Schreibtisch.
            </div>
            <div className="art-index">ANFRAGE → PRÜFUNG → KLARHEIT</div>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>
            <MessagesSquare size={18} />
            Persönliche anwaltliche Beratung
          </span>
          <span>
            <LockKeyhole size={17} />
            Geschützte Kommunikation
          </span>
          <span>
            <FileCheck2 size={18} />
            Kosten vor Beauftragung klären
          </span>
        </div>
      </div>
      <section id="rechtsgebiete" className="section practice-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <Eyebrow>Vier Rechtsgebiete. Ein direkter Zugang.</Eyebrow>
              <h2>Was führt Sie zu uns?</h2>
            </div>
            <p>
              Manchmal beginnt es mit einem Brief.
              <br />
              Manchmal mit einem Klick. Hier finden
              <br className="desktop-break" /> Sie den passenden Einstieg.
            </p>
          </div>
          <div className="practice-grid">
            {practices.map((p) => {
              const Icon = icons[p.icon];
              return (
                <Link href={`/${p.slug}`} key={p.slug} className="practice-card">
                  <div className="practice-card-top">
                    <Icon size={27} strokeWidth={1.35} />
                    <ArrowUpRight size={19} />
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <ul>
                    {p.topics.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <span className="card-link">
                    Mehr erfahren
                    <ArrowUpRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="section-note">
            Sie sind unsicher, wo Ihr Anliegen hingehört?{' '}
            <Link href="/anfrage">
              Beschreiben Sie uns Ihre Situation.
              <ArrowUpRight size={13} />
            </Link>
          </p>
        </div>
      </section>
      <section className="digital-section section">
        <div className="container digital-grid">
          <div>
            <Eyebrow>Digital im Ablauf. Persönlich im Gespräch.</Eyebrow>
            <h2>
              Weniger Wege.
              <br />
              Mehr Raum für
              <br />
              <em>das Wesentliche.</em>
            </h2>
            <p>
              Ein rechtliches Problem passt selten in den Kalender. Die Zusammenarbeit sollte
              deshalb so unkompliziert wie möglich sein.
            </p>
            <Button href="/ablauf" secondary>
              So arbeiten wir zusammen
            </Button>
          </div>
          <div className="benefits">
            <article>
              <MessagesSquare />
              <div>
                <h3>Ein Ansprechpartner. Klare Antworten.</h3>
                <p>
                  Ihre Situation steht im Mittelpunkt. Die Beratung erfolgt durch befugte
                  Rechtsanwältinnen und Rechtsanwälte.
                </p>
              </div>
            </article>
            <article>
              <FileCheck2 />
              <div>
                <h3>Ihre Unterlagen an einem Ort.</h3>
                <p>
                  Dokumente und Nachrichten bleiben Ihrer Akte zugeordnet. Im Mandantenbereich
                  behalten Sie den Überblick.
                </p>
              </div>
            </article>
            <article>
              <CalendarDays />
              <div>
                <h3>Beratung, die in Ihren Alltag passt.</h3>
                <p>
                  Telefonisch oder per angebundener Videoberatung, nach Vereinbarung. Persönliche
                  Termine, wenn der Fall sie erfordert.
                </p>
              </div>
            </article>
            <article>
              <LockKeyhole />
              <div>
                <h3>Vertraulichkeit ist die Grundlage.</h3>
                <p>
                  Geschützte Zugänge und gezielte Berechtigungen bestimmen, wer Ihre Informationen
                  einsehen darf.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="section process-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <Eyebrow>Von der Frage zur Zusammenarbeit</Eyebrow>
              <h2>
                Der erste Schritt ist Ihrer.
                <br />
                Den weiteren Weg klären wir gemeinsam.
              </h2>
            </div>
          </div>
          <div className="process-grid">
            {processSteps.map((s, i) => (
              <article key={s.title}>
                <span className="step-number">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
          <div className="process-footer">
            <Button href="/anfrage">Anliegen schildern</Button>
            <span>Die Anfrage ist noch keine Mandatsannahme und wahrt keine Fristen.</span>
          </div>
        </div>
      </section>
      <section className="section firm-teaser">
        <div className="container firm-teaser-grid">
          <div className="statement">
            <span className="statement-mark">§</span>
            <p>
              Gute Beratung beginnt
              <br />
              mit genauem <em>Zuhören.</em>
            </p>
            <span>UNSER ANSPRUCH AN DIE ZUSAMMENARBEIT</span>
          </div>
          <div>
            <Eyebrow>Menschen hinter dem Mandat</Eyebrow>
            <h2>
              Digitale Kanzlei.
              <br />
              Persönliche Verantwortung.
            </h2>
            <p>
              {firm.about ||
                'Sie sollen wissen, wer sich um Ihre Angelegenheit kümmert. Deshalb werden hier ausschließlich tatsächlich tätige und von der Kanzlei bestätigte Berufsträger vorgestellt.'}
            </p>
            <p>
              {firm.lawyers.length
                ? firm.lawyers.map((l) => l.name).join(' · ')
                : 'Die Kanzlei befindet sich in Vorbereitung. Angaben zu den verantwortlichen Rechtsanwältinnen und Rechtsanwälten folgen vor dem Start.'}
            </p>
            <Link className="text-link" href="/kanzlei">
              Die Kanzlei kennenlernen
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container faq-grid">
          <div>
            <Eyebrow>Vorab gut informiert</Eyebrow>
            <h2>
              Vielleicht ist Ihre
              <br />
              Frage schon dabei.
            </h2>
            <p>Zum Ablauf, zur Vergütung und zur digitalen Zusammenarbeit.</p>
            <Link className="text-link" href="/faq">
              Alle Fragen & Antworten
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <FaqList items={commonFaq.slice(0, 5)} />
        </div>
      </section>
      <ContactCta />
    </>
  );
}
