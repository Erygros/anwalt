import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { ApiError, audit, rateLimit, requireCase, requireUser, readBoundedBody } from './security';
import { adminDb } from './supabase/server';
import { detectMime } from './file-validation';
export async function uploadDocument(request: Request) {
  if (!process.env.MALWARE_SCAN_URL || !process.env.MALWARE_SCAN_TOKEN)
    throw new ApiError(
      503,
      'Der sichere Dokumentenupload ist noch nicht freigeschaltet. Sie können die Anfrage ohne Unterlagen senden.',
    );
  const actor = await requireUser();
  await rateLimit(actor.user.id, 'upload', 30);
  const bounded = await readBoundedBody(request, 4 * 1024 * 1024);
  const form = await new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: new Uint8Array(bounded),
  }).formData();
  const caseId = form.get('caseId');
  const file = form.get('file');
  if (typeof caseId !== 'string' || !/^[a-f0-9-]{36}$/i.test(caseId) || !(file instanceof File))
    throw new ApiError(400, 'Bitte wählen Sie eine Datei und eine Akte.');
  const ctx = await requireCase(caseId);
  if (['declined', 'closed'].includes(ctx.record.status))
    throw new ApiError(409, 'Für diese Akte werden keine neuen Unterlagen angenommen.');
  if (!file.size || file.size > 3 * 1024 * 1024)
    throw new ApiError(413, 'Eine Datei muss zwischen 1 Byte und 3 MB groß sein.');
  const { count } = await adminDb()
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', caseId);
  if ((count ?? 0) >= 100)
    throw new ApiError(
      409,
      'Für diese Akte ist die Uploadgrenze erreicht. Bitte kontaktieren Sie die Kanzlei.',
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectMime(bytes);
  const exts: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'text/plain': 'txt',
  };
  if (
    !mime ||
    (file.type &&
      file.type !== mime &&
      !(mime === 'text/plain' && file.type === 'application/octet-stream'))
  )
    throw new ApiError(
      415,
      'Zulässig sind PDF, JPG, PNG und einfache Textdateien mit passendem Dateiinhalt.',
    );
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const scan = await fetch(process.env.MALWARE_SCAN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MALWARE_SCAN_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);
  if (!scan?.ok)
    throw new ApiError(
      503,
      'Die Sicherheitsprüfung ist derzeit nicht erreichbar. Bitte versuchen Sie den Upload später.',
    );
  const verdict = await scan.json();
  if (verdict.clean !== true || verdict.sha256 !== sha256)
    throw new ApiError(422, 'Die Datei wurde von der Sicherheitsprüfung nicht freigegeben.');
  const id = randomUUID();
  const path = `${caseId}/${id}.${exts[mime]}`;
  const admin = adminDb();
  await audit(ctx.user.id, 'upload', 'document', id);
  const { error: storageError } = await admin.storage
    .from('case-documents')
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (storageError) throw new Error('UPLOAD_FAILED');
  const { error } = await admin.from('documents').insert({
    id,
    case_id: caseId,
    uploader_id: ctx.user.id,
    // eslint-disable-next-line no-control-regex -- Deliberately strip control characters from untrusted filenames.
    name: file.name.replace(/[\x00-\x1f<>]/g, '').slice(0, 180),
    path,
    mime,
    size: file.size,
    sha256,
    scan_status: 'clean',
  });
  if (error) {
    await admin.storage.from('case-documents').remove([path]);
    throw new Error('UPLOAD_FAILED');
  }
  return { id, name: file.name.slice(0, 180) };
}
