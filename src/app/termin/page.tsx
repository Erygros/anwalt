import type { Metadata } from 'next';
import { BookingCalendar } from '@/components/booking-calendar';
import { Eyebrow } from '@/components/ui';
import { getSlots, getSession } from '@/lib/api-actions';
export const metadata: Metadata = { title: 'Termin vereinbaren' };
export default async function AppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ umbuchen?: string }>;
}) {
  const [data, session, params] = await Promise.all([getSlots(), getSession(), searchParams]);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Eyebrow>Ein Gespräch vereinbaren</Eyebrow>
          <h1>Zeit für Ihre Fragen.</h1>
          <p>
            Wählen Sie einen freigegebenen Termin. Die Kanzlei bespricht mit Ihnen, welche Beratung
            für Ihr Anliegen möglich ist.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container form-shell">
          <BookingCalendar
            slots={data.slots}
            live={data.live}
            authenticated={session.authenticated && !session.staff}
            replaceId={params.umbuchen}
          />
        </div>
      </section>
    </>
  );
}
