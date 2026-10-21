import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="section">
      <div className="container empty-state">
        <h1>Hier führt der Weg nicht weiter.</h1>
        <p>Die aufgerufene Seite wurde nicht gefunden.</p>
        <Link href="/" className="button">
          Zur Startseite
        </Link>
      </div>
    </section>
  );
}
