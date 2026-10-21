import 'server-only';
import { notFound } from 'next/navigation';
import { adminDb } from './supabase/server';
import { audit, requireCase } from './security';
export async function loadCase(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const ctx = await requireCase(id);
  await audit(ctx.user.id, 'view', 'case', id);
  const [messages, documents, tasks, events] = await Promise.all([
    ctx.client.from('messages').select('*').eq('case_id', id).order('created_at').limit(500),
    ctx.client
      .from('documents')
      .select('id,name,size,created_at')
      .eq('case_id', id)
      .order('created_at'),
    ctx.role
      ? ctx.client.from('tasks').select('*').eq('case_id', id).order('due_at')
      : Promise.resolve({ data: [] }),
    ctx.client
      .from('case_events')
      .select('id,status,created_at')
      .eq('case_id', id)
      .order('created_at'),
  ]);
  if (messages.error || documents.error || ('error' in tasks && tasks.error) || events.error)
    throw new Error('DATA_UNAVAILABLE');
  let members: { user_id: string; role: string; assigned: boolean }[] = [];
  if (ctx.role === 'admin') {
    const [staff, assigned] = await Promise.all([
      adminDb().from('staff_members').select('user_id,role').eq('active', true),
      adminDb().from('case_members').select('user_id').eq('case_id', id),
    ]);
    members = (staff.data ?? []).map((s) => ({
      ...s,
      assigned: !!assigned.data?.some((a) => a.user_id === s.user_id),
    }));
  }
  return {
    ctx,
    messages: messages.data ?? [],
    documents: documents.data ?? [],
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    members,
  };
}
