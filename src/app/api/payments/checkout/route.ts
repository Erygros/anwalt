import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import {
  checkOrigin,
  readJson,
  failure,
  requireUser,
  requireCase,
  ApiError,
  audit,
  rateLimit,
  assertLive,
} from '@/lib/security';
import { adminDb } from '@/lib/supabase/server';
import { getFirm, readiness } from '@/lib/settings';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await assertLive();
    if (!(await readiness()).payments)
      throw new ApiError(503, 'Onlinezahlungen sind noch nicht freigeschaltet.');
    const { invoiceId } = z
      .object({ invoiceId: z.string().uuid(), accepted: z.literal(true) })
      .parse(await readJson(request));
    const ctx = await requireUser();
    if (ctx.role) throw new ApiError(403, 'Zahlungen sind nur über ein Mandantenkonto möglich.');
    await rateLimit(ctx.user.id, 'checkout', 10);
    const { data: invoice } = await ctx.client
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('client_id', ctx.user.id)
      .single();
    if (!invoice || invoice.status !== 'open')
      throw new ApiError(404, 'Keine offene Zahlungsanforderung gefunden.');
    const c = await requireCase(invoice.case_id);
    if (c.record.status !== 'accepted')
      throw new ApiError(409, 'Die Leistung kann derzeit nicht bezahlt werden.');
    const firm = await getFirm();
    if (!firm.mandateTerms || !firm.cancellationText)
      throw new ApiError(503, 'Vertragsinformationen fehlen.');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    if (invoice.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(invoice.stripe_session_id);
      if (existing.status === 'open' && existing.url)
        return NextResponse.json({ url: existing.url });
      if (existing.status === 'complete')
        throw new ApiError(
          409,
          'Die Zahlung wird bereits abgeglichen. Bitte aktualisieren Sie den Zahlungsstand später.',
        );
    }
    await audit(ctx.user.id, 'checkout_terms_accepted', 'invoice', invoiceId);
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: invoiceId,
        customer_email: ctx.user.email,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/rechnungen?zahlung=eingegangen`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/rechnungen`,
        metadata: { invoice_id: invoiceId },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: invoice.amount,
              product_data: { name: `Anwaltliche Leistung – Rechnung ${invoice.number}` },
            },
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
      { idempotencyKey: `invoice:${invoiceId}:${invoice.stripe_session_id || 'initial'}` },
    );
    const { error } = await adminDb()
      .from('invoices')
      .update({ stripe_session_id: session.id })
      .eq('id', invoiceId)
      .eq('status', 'open');
    if (error) throw error;
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
