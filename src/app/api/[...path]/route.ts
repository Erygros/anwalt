import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/server';
import {
  checkOrigin,
  failure,
  readJson,
  requireCase,
  requireUser,
  audit,
  rateLimit,
  ApiError,
} from '@/lib/security';
import * as actions from '@/lib/api-actions';
import { uploadDocument } from '@/lib/uploads';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const path = (await params).path.join('/');
    if (path === 'session') return NextResponse.json(await actions.getSession());
    if (path === 'slots') return NextResponse.json(await actions.getSlots());
    if (path === 'export')
      return NextResponse.json(await actions.exportData(), {
        headers: { 'Content-Disposition': 'attachment; filename="meine-daten.json"' },
      });
    if (path === 'documents/download') {
      const id = z.string().uuid().parse(new URL(request.url).searchParams.get('id'));
      const { client, user } = await requireUser();
      await rateLimit(user.id, 'download', 60);
      const { data: d } = await client
        .from('documents')
        .select('id,case_id,path,name')
        .eq('id', id)
        .single();
      if (!d) throw new ApiError(404, 'Dokument nicht gefunden.');
      await requireCase(d.case_id);
      await audit(user.id, 'download', 'document', id);
      const { data, error } = await adminDb()
        .storage.from('case-documents')
        .createSignedUrl(d.path, 60, { download: d.name });
      if (error) throw error;
      return NextResponse.redirect(data.signedUrl, 303);
    }
    throw new ApiError(404, 'Schnittstelle nicht gefunden.');
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const path = (await params).path.join('/');
    if (path === 'documents/upload') return NextResponse.json(await uploadDocument(request));
    const input = await readJson(request);
    let result: unknown;
    switch (path) {
      case 'intake/draft':
        result = await actions.createDraft(input);
        break;
      case 'intake':
        result = await actions.submitIntake(input);
        break;
      case 'messages':
        result = await actions.sendMessage(input);
        break;
      case 'appointments':
        result = await actions.bookAppointment(input);
        break;
      case 'appointments/cancel':
        result = await actions.cancelAppointment(input);
        break;
      case 'profile':
        result = await actions.saveProfile(input);
        break;
      case 'privacy':
        result = await actions.privacyRequest(input);
        break;
      case 'notifications/read':
        result = await actions.markNotifications();
        break;
      case 'admin':
        result = await actions.adminAction(input);
        break;
      default:
        throw new ApiError(404, 'Schnittstelle nicht gefunden.');
    }
    return NextResponse.json(result);
  } catch (e) {
    return failure(e);
  }
}
