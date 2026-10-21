import 'server-only';
import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { db, adminDb, configured } from './supabase/server';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function failure(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json(
      {
        error: 'Bitte prüfen Sie die markierten Angaben.',
        fields: e.issues.map((i) => i.path.join('.')),
      },
      { status: 400 },
    );
  // Do not log exception payloads: providers can embed confidential input in errors.
  return NextResponse.json(
    {
      error: 'Der Vorgang konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.',
    },
    { status: 503 },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.NEXT_PUBLIC_SITE_URL;
  if (!expected || origin !== new URL(expected).origin)
    throw new ApiError(
      403,
      'Die Anfrage stammt nicht von dieser Website. Bitte laden Sie die Seite neu.',
    );
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    throw new ApiError(403, 'Anfrage nicht zulässig.');
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'JSON wird erwartet.');
  const text = await request.text();
  if (Buffer.byteLength(text) > 150000) throw new ApiError(413, 'Die Eingabe ist zu groß.');
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, 'Die Eingabe konnte nicht gelesen werden.');
  }
}
export async function requireUser() {
  if (!configured()) throw new ApiError(503, 'Der Mandantenbereich ist noch nicht eingerichtet.');
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at)
    throw new ApiError(401, 'Bitte melden Sie sich mit einer bestätigten E-Mail-Adresse an.');
  const { data: staff } = await adminDb()
    .from('staff_members')
    .select('role,active')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();
  const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || ((staff || aal?.nextLevel === 'aal2') && aal?.currentLevel !== 'aal2'))
    throw new ApiError(403, 'Für dieses Konto ist die Zwei-Faktor-Anmeldung erforderlich.');
  return { user, client, role: staff?.role as 'admin' | 'lawyer' | 'assistant' | undefined };
}
export async function requireStaff(allowed: string[] = ['admin', 'lawyer', 'assistant']) {
  const ctx = await requireUser();
  if (!ctx.role || !allowed.includes(ctx.role))
    throw new ApiError(403, 'Dafür fehlt die Berechtigung.');
  return ctx;
}
export async function requireCase(id: string) {
  const ctx = await requireUser();
  const { data, error } = await ctx.client.from('cases').select('*').eq('id', id).maybeSingle();
  if (error || !data || data.purging_at)
    throw new ApiError(404, 'Die Akte wurde nicht gefunden oder ist nicht freigegeben.');
  return { ...ctx, record: data };
}
export async function rateLimit(userId: string, action: string, limit = 20, seconds = 3600) {
  const salt = process.env.RATE_LIMIT_SECRET;
  if (!salt || salt.length < 32)
    throw new ApiError(503, 'Die Schutzfunktionen sind noch nicht eingerichtet.');
  const key = createHmac('sha256', salt).update(`${action}:${userId}`).digest('hex');
  const { data, error } = await adminDb().rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw new ApiError(503, 'Die Anfrageprüfung ist vorübergehend nicht verfügbar.');
  if (!data) throw new ApiError(429, 'Zu viele Versuche. Bitte versuchen Sie es später erneut.');
}
export async function audit(actor: string | null, action: string, type: string, id?: string) {
  const { error } = await adminDb()
    .from('audit_logs')
    .insert({ actor_id: actor, action, entity_type: type, entity_id: id });
  if (error) throw new ApiError(503, 'Das Zugriffsprotokoll ist nicht verfügbar.');
}
export async function assertLive() {
  const { readiness } = await import('./settings');
  if (!(await readiness()).live)
    throw new ApiError(503, 'Die Kanzlei hat den Beratungsbetrieb noch nicht freigeschaltet.');
}
