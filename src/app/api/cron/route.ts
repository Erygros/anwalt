import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminDb, configured } from '@/lib/supabase/server';
import { flushMail, queueMail } from '@/lib/mail';
import { audit } from '@/lib/security';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const admin = adminDb();
  const now = new Date();
  const { data: appointments } = await admin
    .from('appointments')
    .select('id,client_id,availability_slots!inner(starts_at)')
    .eq('status', 'booked')
    .is('reminder_sent_at', null)
    .gte('availability_slots.starts_at', now.toISOString())
    .lte('availability_slots.starts_at', new Date(now.getTime() + 24 * 3600000).toISOString())
    .limit(50);
  for (const a of appointments ?? []) {
    await queueMail(a.client_id, 'appointment_reminder', `reminder:${a.id}`);
    await admin.from('appointments').update({ reminder_sent_at: now.toISOString() }).eq('id', a.id);
  }
  const { data: tasks } = await admin
    .from('tasks')
    .select('id,assigned_to,due_at')
    .is('completed_at', null)
    .lte('due_at', new Date(now.getTime() + 24 * 3600000).toISOString())
    .limit(50);
  for (const t of tasks ?? []) {
    if (t.assigned_to)
      await queueMail(
        t.assigned_to,
        'task_reminder',
        `task:${t.id}:${now.toISOString().slice(0, 10)}`,
      );
  }
  // Drafts expire after 30 days. Closed/declined cases require an explicit, elapsed
  // retention date and no legal hold. Accepted cases and invoices are never purged here.
  const { data: cases } = await admin
    .from('cases')
    .select('id,status,created_at,retention_until,legal_hold')
    .eq('legal_hold', false)
    .or(
      `and(status.eq.draft,created_at.lt.${new Date(now.getTime() - 30 * 86400000).toISOString()}),and(status.in.(closed,declined),retention_until.lt.${now.toISOString().slice(0, 10)})`,
    )
    .limit(20);
  let purged = 0;
  for (const c of cases ?? []) {
    const { data: claimed, error: claimError } = await admin.rpc('claim_retention_purge', {
      p_case: c.id,
    });
    if (claimError || !claimed) continue;
    const { data: docs } = await admin.from('documents').select('path').eq('case_id', c.id);
    if (docs?.length) {
      const { error } = await admin.storage.from('case-documents').remove(docs.map((d) => d.path));
      if (error) continue;
    }
    await audit(null, 'retention_purge', 'case', c.id);
    const { error } = await admin
      .from('cases')
      .delete()
      .eq('id', c.id)
      .not('purging_at', 'is', null);
    if (!error) purged++;
  }
  await admin.from('rate_limits').delete().lt('expires_at', now.toISOString());
  await admin
    .from('mail_outbox')
    .delete()
    .eq('status', 'sent')
    .lt('sent_at', new Date(now.getTime() - 30 * 86400000).toISOString());
  const mail = await flushMail(8);
  return NextResponse.json({ ok: true, purged, ...mail });
}
