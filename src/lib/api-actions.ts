import 'server-only';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { adminDb, db, configured } from './supabase/server';
import {
  ApiError,
  assertLive,
  audit,
  rateLimit,
  requireCase,
  requireStaff,
  requireUser,
} from './security';
import {
  bookingSchema,
  firmSchema,
  intakeSchema,
  messageSchema,
  practiceSchema,
  profileSchema,
  uuid,
} from './validation';
import { getFirm, readiness } from './settings';
import { notify, queueMail } from './mail';
import { contentSchema } from './cms-schema';

export async function getSession() {
  if (!configured()) return { authenticated: false, configured: false };
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { authenticated: false, configured: true };
  const { data: staff } = await adminDb()
    .from('staff_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();
  const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    authenticated: !!user.email_confirmed_at,
    email: user.email,
    staff: !!staff,
    mfaRequired: (!!staff || aal?.nextLevel === 'aal2') && aal?.currentLevel !== 'aal2',
    configured: true,
  };
}
export async function getSlots() {
  if (!(await readiness()).live) return { slots: [], live: false, video: false };
  const admin = adminDb();
  const { data: slots, error } = await admin
    .from('availability_slots')
    .select('id,starts_at,ends_at,modes,staff_id')
    .eq('enabled', true)
    .gte('starts_at', new Date(Date.now() + 7200000).toISOString())
    .lte('starts_at', new Date(Date.now() + 42 * 86400000).toISOString())
    .order('starts_at')
    .limit(300);
  if (error) throw error;
  const { data: bookings } = await admin
    .from('appointments')
    .select('slot_id')
    .eq('status', 'booked')
    .in(
      'slot_id',
      (slots ?? []).map((s) => s.id),
    );
  const { data: staff } = await admin
    .from('staff_members')
    .select('user_id')
    .eq('active', true)
    .in('role', ['admin', 'lawyer']);
  const taken = new Set((bookings ?? []).map((b) => b.slot_id));
  const active = new Set((staff ?? []).map((s) => s.user_id));
  return {
    slots: (slots ?? [])
      .filter((s) => !taken.has(s.id) && active.has(s.staff_id))
      .map(({ staff_id, ...s }) => ({
        ...s,
        modes: process.env.VIDEO_PROVIDER_HOST
          ? s.modes
          : s.modes.filter((m: string) => m !== 'video'),
      }))
      .filter((s) => s.modes.length),
    live: true,
    video: !!process.env.VIDEO_PROVIDER_HOST,
  };
}
export async function createDraft(input: unknown) {
  await assertLive();
  const { user, role } = await requireUser();
  if (role) throw new ApiError(403, 'Bitte verwenden Sie für Mandatsanfragen ein Mandantenkonto.');
  await rateLimit(user.id, 'draft', 10);
  const { practice } = z.object({ practice: practiceSchema }).parse(input);
  const { data, error } = await adminDb()
    .from('cases')
    .insert({ client_id: user.id, practice })
    .select('id')
    .single();
  if (error) throw error;
  await audit(user.id, 'create_draft', 'case', data.id);
  return data;
}
export async function submitIntake(input: unknown) {
  await assertLive();
  const data = intakeSchema.parse(input);
  const ctx = await requireUser();
  if (ctx.role) throw new ApiError(403, 'Bitte verwenden Sie ein Mandantenkonto.');
  await rateLimit(ctx.user.id, 'intake', 5);
  const { data: rows, error } = await adminDb().rpc('submit_intake', {
    p_user: ctx.user.id,
    p_draft: data.id || null,
    p_practice: data.practice,
    p_subject: data.subject,
    p_urgency: data.urgency,
    p_facts: data.facts,
    p_deadline: data.deadline,
    p_opponent: data.opponent,
    p_name: data.fullName,
    p_phone: data.phone,
    p_company: data.company,
  });
  if (error || !rows?.[0])
    throw new ApiError(
      409,
      'Die Anfrage konnte nicht übermittelt werden. Prüfen Sie im Mandantenbereich, ob sie bereits eingegangen ist.',
    );
  const record = rows[0];
  return { reference: record.reference, id: record.id };
}
export async function sendMessage(input: unknown) {
  const data = messageSchema.parse(input);
  const ctx = await requireCase(data.caseId);
  await rateLimit(ctx.user.id, 'message', 60);
  if (data.internal && !ctx.role)
    throw new ApiError(403, 'Interne Notizen sind der Kanzlei vorbehalten.');
  if (['draft', 'closed', 'declined'].includes(ctx.record.status))
    throw new ApiError(409, 'Diese Akte ist nicht für neue Nachrichten geöffnet.');
  const { data: row, error } = await adminDb()
    .from('messages')
    .insert({
      case_id: data.caseId,
      sender_id: ctx.user.id,
      body: data.body,
      internal: data.internal,
    })
    .select('id')
    .single();
  if (error) throw error;
  await audit(ctx.user.id, data.internal ? 'internal_note' : 'send_message', 'case', data.caseId);
  if (ctx.role && !data.internal) {
    await queueMail(ctx.record.client_id, 'message', `message:${row.id}`);
    await notify(
      ctx.record.client_id,
      'Eine neue Nachricht liegt vor.',
      `/portal/akten/${data.caseId}`,
    );
  }
  if (!ctx.role) {
    const { data: members } = await adminDb()
      .from('case_members')
      .select('user_id')
      .eq('case_id', data.caseId);
    const { data: admins } = await adminDb()
      .from('staff_members')
      .select('user_id')
      .eq('role', 'admin')
      .eq('active', true);
    for (const id of new Set([...(members ?? []), ...(admins ?? [])].map((m) => m.user_id)))
      await queueMail(id, 'message', `message:${row.id}:${id}`);
  }
  return { ok: true };
}
export async function bookAppointment(input: unknown) {
  await assertLive();
  const data = bookingSchema.parse(input);
  const ctx = await requireUser();
  if (ctx.role) throw new ApiError(403, 'Bitte buchen Sie mit einem Mandantenkonto.');
  await rateLimit(ctx.user.id, 'booking', 10);
  if (data.mode === 'video' && !process.env.VIDEO_PROVIDER_HOST)
    throw new ApiError(503, 'Videoberatung ist noch nicht angebunden.');
  const { data: aid, error } = await adminDb().rpc('book_appointment', {
    p_user: ctx.user.id,
    p_slot: data.slotId,
    p_mode: data.mode,
    p_case: data.caseId,
    p_replace: data.replaceId,
  });
  if (error)
    throw new ApiError(
      409,
      'Der Termin ist nicht mehr verfügbar oder überschneidet sich mit einer Buchung. Bitte wählen Sie einen anderen Termin.',
    );
  return { id: aid };
}
export async function cancelAppointment(input: unknown) {
  const { id } = z.object({ id: uuid }).parse(input);
  const ctx = await requireUser();
  await rateLimit(ctx.user.id, 'cancel', 20);
  const { data: record } = await ctx.client
    .from('appointments')
    .select('id,client_id,slot_id,status')
    .eq('id', id)
    .single();
  if (!record) throw new ApiError(404, 'Termin nicht gefunden.');
  const { data: slot } = await adminDb()
    .from('availability_slots')
    .select('starts_at')
    .eq('id', record.slot_id)
    .single();
  if (!slot || new Date(slot.starts_at) <= new Date())
    throw new ApiError(409, 'Vergangene Termine können nicht storniert werden.');
  const { error } = await adminDb()
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'booked');
  if (error) throw error;
  await audit(ctx.user.id, 'cancel', 'appointment', id);
  await queueMail(record.client_id, 'appointment_cancelled', `cancel:${id}`);
  return { ok: true };
}
export async function saveProfile(input: unknown) {
  const data = profileSchema.parse(input);
  const { user } = await requireUser();
  await rateLimit(user.id, 'profile', 20);
  const { error } = await adminDb().from('profiles').update(data).eq('id', user.id);
  if (error) throw error;
  await audit(user.id, 'update', 'profile', user.id);
  return { ok: true };
}
export async function privacyRequest(input: unknown) {
  const { kind } = z.object({ kind: z.enum(['access', 'erasure']) }).parse(input);
  const { user } = await requireUser();
  await rateLimit(user.id, 'privacy', 2, 86400);
  const { error } = await adminDb().from('privacy_requests').insert({ user_id: user.id, kind });
  if (error) throw error;
  await audit(user.id, 'request_' + kind, 'profile', user.id);
  return { ok: true };
}
export async function exportData() {
  const { user, client } = await requireUser();
  await rateLimit(user.id, 'export', 3, 86400);
  await audit(user.id, 'export', 'profile', user.id);
  const [profile, cases, messages, documents, appointments, invoices] = await Promise.all([
    client.from('profiles').select('*').eq('id', user.id),
    client.from('cases').select('*').eq('client_id', user.id),
    client.from('messages').select('*').eq('internal', false),
    client.from('documents').select('id,case_id,name,mime,size,created_at'),
    client.from('appointments').select('*').eq('client_id', user.id),
    client.from('invoices').select('*').eq('client_id', user.id),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    email: user.email,
    profile: profile.data,
    cases: cases.data,
    messages: messages.data,
    documents: documents.data,
    appointments: appointments.data,
    invoices: invoices.data,
  };
}
export async function markNotifications() {
  const { user } = await requireUser();
  await adminDb()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  return { ok: true };
}

export async function adminAction(input: unknown) {
  const envelope = z.object({ action: z.string(), payload: z.unknown() }).parse(input);
  const ctx = await requireStaff();
  await rateLimit(ctx.user.id, 'staff', 150);
  const admin = adminDb();
  switch (envelope.action) {
    case 'content': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration veröffentlicht Seiteninhalte.');
      const value = contentSchema.parse(envelope.payload);
      const { error } = await admin
        .from('settings')
        .upsert({ key: 'content', value, updated_at: new Date().toISOString() });
      if (error) throw error;
      await audit(ctx.user.id, 'publish_content', 'settings', 'content');
      break;
    }
    case 'client-profile': {
      const d = z.object({ userId: uuid, profile: profileSchema }).parse(envelope.payload);
      const { data: visible } = await ctx.client
        .from('profiles')
        .select('id')
        .eq('id', d.userId)
        .single();
      if (!visible) throw new ApiError(404, 'Mandantenkonto nicht freigegeben.');
      const { error } = await admin.from('profiles').update(d.profile).eq('id', d.userId);
      if (error) throw error;
      await audit(ctx.user.id, 'update_client', 'profile', d.userId);
      break;
    }
    case 'erase-account': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration kann geprüfte Löschungen ausführen.');
      const d = z
        .object({ requestId: uuid, confirmation: z.literal('KONTO LÖSCHEN') })
        .parse(envelope.payload);
      const { data: r } = await admin
        .from('privacy_requests')
        .select('*')
        .eq('id', d.requestId)
        .eq('kind', 'erasure')
        .eq('status', 'resolved')
        .single();
      if (!r?.user_id)
        throw new ApiError(409, 'Zuerst eine individuelle Löschprüfung abschließen.');
      const [cases, invoices, staff, appointments] = await Promise.all([
        admin.from('cases').select('id', { count: 'exact', head: true }).eq('client_id', r.user_id),
        admin
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', r.user_id),
        admin
          .from('staff_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('user_id', r.user_id),
        admin
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', r.user_id)
          .eq('status', 'booked'),
      ]);
      if ([cases, invoices, staff, appointments].some((q) => q.error || q.count))
        throw new ApiError(
          409,
          'Das Konto besitzt noch Akten, Rechnungen, Mitarbeiterberechtigungen oder gebuchte Termine. Zuerst die Aufbewahrung und die offenen Vorgänge klären.',
        );
      await audit(ctx.user.id, 'erase_account', 'privacy_request', d.requestId);
      const { error } = await admin.auth.admin.deleteUser(r.user_id);
      if (error)
        throw new ApiError(
          409,
          'Die Löschung wurde durch bestehende Datenverknüpfungen verhindert. Bitte die Aufbewahrung prüfen.',
        );
      break;
    }
    case 'firm': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration kann Kanzleidaten bearbeiten.');
      const value = firmSchema.parse(envelope.payload);
      const { error } = await admin
        .from('settings')
        .upsert({ key: 'firm', value, updated_at: new Date().toISOString() });
      if (error) throw error;
      await audit(ctx.user.id, 'publish_settings', 'firm', 'firm');
      break;
    }
    case 'conflict':
    case 'status': {
      if (ctx.role === 'assistant')
        throw new ApiError(403, 'Die Entscheidung erfordert anwaltliche Freigabe.');
      const d = z
        .object({
          caseId: uuid,
          result: z.enum(['clear', 'conflict']).optional(),
          status: z.enum(['accepted', 'declined', 'closed']).optional(),
        })
        .parse(envelope.payload);
      await requireCase(d.caseId);
      const value = envelope.action === 'conflict' ? d.result : d.status;
      if (!value) throw new ApiError(400, 'Bitte eine Entscheidung auswählen.');
      if (value === 'accepted') await assertLive();
      const firm = await getFirm();
      const { error } = await admin.rpc('review_case', {
        p_actor: ctx.user.id,
        p_case: d.caseId,
        p_kind: envelope.action,
        p_value: value,
        p_terms: firm.legalReviewedAt || null,
      });
      if (error)
        throw new ApiError(
          409,
          'Die Entscheidung passt nicht zum aktuellen Aktenstand. Bitte die Akte aktualisieren und die Konfliktprüfung kontrollieren.',
        );
      break;
    }
    case 'member': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration kann Akten freigeben.');
      const d = z.object({ caseId: uuid, userId: uuid }).parse(envelope.payload);
      const { error } = await admin
        .from('case_members')
        .upsert({ case_id: d.caseId, user_id: d.userId });
      if (error) throw error;
      await audit(ctx.user.id, 'grant_access', 'case', d.caseId);
      break;
    }
    case 'revoke-member': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration kann Berechtigungen ändern.');
      const d = z.object({ caseId: uuid, userId: uuid }).parse(envelope.payload);
      const { error } = await admin
        .from('case_members')
        .delete()
        .eq('case_id', d.caseId)
        .eq('user_id', d.userId);
      if (error) throw error;
      await audit(ctx.user.id, 'revoke_access', 'case', d.caseId);
      break;
    }
    case 'slot': {
      if (ctx.role === 'assistant')
        throw new ApiError(403, 'Termine müssen durch einen Berufsträger freigegeben werden.');
      const d = z
        .object({
          startsAt: z.iso.datetime(),
          endsAt: z.iso.datetime(),
          modes: z
            .array(z.enum(['phone', 'video']))
            .min(1)
            .max(2),
        })
        .parse(envelope.payload);
      if (
        new Date(d.startsAt) <= new Date() ||
        new Date(d.endsAt) <= new Date(d.startsAt) ||
        new Date(d.endsAt).getTime() - new Date(d.startsAt).getTime() > 4 * 3600000
      )
        throw new ApiError(
          400,
          'Bitte wählen Sie einen zukünftigen Zeitraum von höchstens vier Stunden.',
        );
      if (d.modes.includes('video') && !process.env.VIDEO_PROVIDER_HOST)
        throw new ApiError(409, 'Zuerst einen freigegebenen Videoanbieter konfigurieren.');
      const { error } = await admin.from('availability_slots').insert({
        staff_id: ctx.user.id,
        starts_at: d.startsAt,
        ends_at: d.endsAt,
        modes: d.modes,
      });
      if (error)
        throw new ApiError(
          409,
          'Der Zeitraum überschneidet sich mit einem vorhandenen Terminfenster.',
        );
      await audit(ctx.user.id, 'create_slot', 'availability');
      break;
    }
    case 'disable-slot': {
      const d = z.object({ id: uuid }).parse(envelope.payload);
      const { data: slot } = await admin
        .from('availability_slots')
        .select('staff_id')
        .eq('id', d.id)
        .single();
      if (!slot || (ctx.role !== 'admin' && slot.staff_id !== ctx.user.id))
        throw new ApiError(403, 'Keine Berechtigung für dieses Terminfenster.');
      const { count } = await admin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('slot_id', d.id)
        .eq('status', 'booked');
      if (count)
        throw new ApiError(
          409,
          'Ein gebuchtes Terminfenster kann erst nach Stornierung geschlossen werden.',
        );
      await admin.from('availability_slots').update({ enabled: false }).eq('id', d.id);
      await audit(ctx.user.id, 'disable_slot', 'availability', d.id);
      break;
    }
    case 'video-link': {
      const d = z.object({ id: uuid, url: z.url() }).parse(envelope.payload);
      const url = new URL(d.url);
      if (
        url.protocol !== 'https:' ||
        url.hostname !== process.env.VIDEO_PROVIDER_HOST ||
        url.username ||
        url.password
      )
        throw new ApiError(
          400,
          'Bitte einen HTTPS-Link des freigegebenen Videoanbieters verwenden.',
        );
      const { data: a } = await ctx.client
        .from('appointments')
        .select('id,mode')
        .eq('id', d.id)
        .single();
      if (!a || a.mode !== 'video') throw new ApiError(404, 'Videotermin nicht gefunden.');
      await admin.from('appointments').update({ video_url: d.url }).eq('id', d.id);
      await audit(ctx.user.id, 'set_video_link', 'appointment', d.id);
      break;
    }
    case 'task': {
      const d = z
        .object({
          caseId: uuid,
          title: z.string().trim().min(3).max(300),
          dueAt: z.iso.datetime(),
          kind: z.enum(['task', 'deadline', 'followup']),
        })
        .parse(envelope.payload);
      await requireCase(d.caseId);
      const { error } = await admin.from('tasks').insert({
        case_id: d.caseId,
        title: d.title,
        due_at: d.dueAt,
        kind: d.kind,
        assigned_to: ctx.user.id,
      });
      if (error) throw error;
      await audit(ctx.user.id, 'create_task', 'case', d.caseId);
      break;
    }
    case 'complete-task': {
      const d = z.object({ id: uuid }).parse(envelope.payload);
      const { data: t } = await ctx.client.from('tasks').select('case_id').eq('id', d.id).single();
      if (!t) throw new ApiError(404, 'Aufgabe nicht gefunden.');
      await admin.from('tasks').update({ completed_at: new Date().toISOString() }).eq('id', d.id);
      await audit(ctx.user.id, 'complete_task', 'task', d.id);
      break;
    }
    case 'invoice': {
      if (ctx.role === 'assistant')
        throw new ApiError(403, 'Die Rechnungsfreigabe erfordert anwaltliche Berechtigung.');
      const d = z
        .object({ caseId: uuid, serviceId: z.string().max(100), number: z.string().min(2).max(80) })
        .parse(envelope.payload);
      const c = await requireCase(d.caseId);
      if (c.record.status !== 'accepted')
        throw new ApiError(409, 'Rechnungen können nur für angenommene Mandate angelegt werden.');
      const firm = await getFirm();
      const s = firm.services.find((s) => s.id === d.serviceId);
      if (!s) throw new ApiError(400, 'Keine konfigurierte Leistung gewählt.');
      const { error } = await admin.from('invoices').insert({
        case_id: d.caseId,
        client_id: c.record.client_id,
        number: d.number,
        service_id: s.id,
        description: `${s.title}\n${s.description}`,
        amount: s.amount,
        tax_rate: s.taxRate,
      });
      if (error)
        throw new ApiError(
          409,
          'Rechnungsnummer bereits vergeben oder Rechnung nicht speicherbar.',
        );
      await audit(ctx.user.id, 'create_invoice', 'case', d.caseId);
      break;
    }
    case 'retention': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration kann Aufbewahrungsvorgaben ändern.');
      const d = z
        .object({ caseId: uuid, until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hold: z.boolean() })
        .parse(envelope.payload);
      await requireCase(d.caseId);
      await admin
        .from('cases')
        .update({ retention_until: d.until, legal_hold: d.hold })
        .eq('id', d.caseId);
      await audit(ctx.user.id, 'retention_changed', 'case', d.caseId);
      break;
    }
    case 'privacy': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration bearbeitet Datenschutzanfragen.');
      const d = z
        .object({
          id: uuid,
          status: z.enum(['resolved', 'retained']),
          resolution: z.string().trim().min(10).max(3000),
        })
        .parse(envelope.payload);
      await admin
        .from('privacy_requests')
        .update({
          status: d.status,
          resolution: d.resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', d.id);
      await audit(ctx.user.id, 'privacy_' + d.status, 'privacy_request', d.id);
      break;
    }
    case 'staff': {
      if (ctx.role !== 'admin')
        throw new ApiError(403, 'Nur die Administration verwaltet Mitarbeiter.');
      const d = z
        .object({
          userId: uuid,
          role: z.enum(['admin', 'lawyer', 'assistant']),
          active: z.boolean(),
        })
        .parse(envelope.payload);
      if (d.userId === ctx.user.id)
        throw new ApiError(400, 'Eigene Berechtigungen können hier nicht geändert werden.');
      const { error } = await admin
        .from('staff_members')
        .upsert({ user_id: d.userId, role: d.role, active: d.active });
      if (error) throw error;
      await audit(ctx.user.id, 'staff_changed', 'staff', d.userId);
      break;
    }
    default:
      throw new ApiError(400, 'Unbekannte Aktion.');
  }
  return { ok: true };
}
