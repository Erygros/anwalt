import 'server-only';
import { cache } from 'react';
import { adminDb, configured } from './supabase/server';
import { defaultFirm, type Firm, isFirmComplete } from './firm';
export const getFirm = cache(async (): Promise<Firm> => {
  if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaultFirm;
  const { data } = await adminDb().from('settings').select('value').eq('key', 'firm').maybeSingle();
  return { ...defaultFirm, ...(data?.value ?? {}) };
});
export async function readiness() {
  const firm = await getFirm();
  return {
    live:
      process.env.FIRM_LIVE === 'true' &&
      isFirmComplete(firm) &&
      configured() &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !!process.env.RESEND_API_KEY &&
      !!process.env.MAIL_FROM &&
      (process.env.RATE_LIMIT_SECRET?.length ?? 0) >= 32,
    auth: configured(),
    uploads: !!(process.env.MALWARE_SCAN_URL && process.env.MALWARE_SCAN_TOKEN),
    payments: !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      firm.cancellationText &&
      firm.mandateTerms
    ),
    video: !!process.env.VIDEO_PROVIDER_HOST,
  };
}
