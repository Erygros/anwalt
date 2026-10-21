'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="section">
      <div className="container empty-state">
        <h1>Die Seite konnte nicht geladen werden.</h1>
        <p>Bitte versuchen Sie es erneut. Bereits gespeicherte Daten bleiben erhalten.</p>
        <button className="button" onClick={reset}>
          Erneut versuchen
        </button>
      </div>
    </section>
  );
}
