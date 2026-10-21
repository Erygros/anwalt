import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { ApiError, audit, rateLimit, requireCase } from './security';
import { adminDb } from './supabase/server';
export function detectMime(b:Buffer):string|null {
  if(b.subarray(0,5).toString()==='%PDF-') return 'application/pdf';
  if(b[0]===0xff && b[1]===0xd8 && b[2]===0xff) return 'image/jpeg';
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if(!b.includes(0) && !b.toString('utf8').includes('\ufffd') && !/<\s*(?:script|html|svg|!doctype)/i.test(b.toString('utf8'))) return 'text/plain';
  return null;
}
export async function uploadDocument(request:Request) {
  if(!process.env.MALWARE_SCAN_URL || !process.env.MALWARE_SCAN_TOKEN) throw new ApiError(503,'Der sichere Dokumentenupload ist noch nicht freigeschaltet. Sie können die Anfrage ohne Unterlagen senden.');
  const size=Number(request.headers.get('content-length')||0); if(size>11*1024*1024) throw new ApiError(413,'Eine Datei darf höchstens 10 MB groß sein.');
  const form=await request.formData(); const caseId=form.get('caseId'); const file=form.get('file');
  if(typeof caseId!=='string' || !/^[a-f0-9-]{36}$/i.test(caseId) || !(file instanceof File)) throw new ApiError(400,'Bitte wählen Sie eine Datei und eine Akte.');
  const ctx=await requireCase(caseId); if(['declined','closed'].includes(ctx.record.status)) throw new ApiError(409,'Für diese Akte werden keine neuen Unterlagen angenommen.');
  await rateLimit(ctx.user.id,'upload',30); if(!file.size || file.size>10*1024*1024) throw new ApiError(413,'Eine Datei muss zwischen 1 Byte und 10 MB groß sein.');
  const {count}=await adminDb().from('documents').select('id',{count:'exact',head:true}).eq('case_id',caseId); if((count??0)>=100) throw new ApiError(409,'Für diese Akte ist die Uploadgrenze erreicht. Bitte kontaktieren Sie die Kanzlei.');
  const bytes=Buffer.from(await file.arrayBuffer()); const mime=detectMime(bytes);
  const exts:Record<string,string>={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','text/plain':'txt'};
  if(!mime || (file.type && file.type!==mime && !(mime==='text/plain' && file.type==='application/octet-stream'))) throw new ApiError(415,'Zulässig sind PDF, JPG, PNG und einfache Textdateien mit passendem Dateiinhalt.');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const scan=await fetch(process.env.MALWARE_SCAN_URL,{method:'POST',headers:{Authorization:`Bearer ${process.env.MALWARE_SCAN_TOKEN}`,'Content-Type':'application/octet-stream'},body:new Uint8Array(bytes),signal:AbortSignal.timeout(30000)}).catch(()=>null);
  if(!scan?.ok) throw new ApiError(503,'Die Sicherheitsprüfung ist derzeit nicht erreichbar. Bitte versuchen Sie den Upload später.');
  const verdict=await scan.json(); if(verdict.clean!==true || verdict.sha256!==sha256) throw new ApiError(422,'Die Datei wurde von der Sicherheitsprüfung nicht freigegeben.');
  const id=randomUUID(); const path=`${caseId}/${id}.${exts[mime]}`; const admin=adminDb();
  await audit(ctx.user.id,'upload','document',id);
  const {error:storageError}=await admin.storage.from('case-documents').upload(path,bytes,{contentType:mime,upsert:false}); if(storageError) throw new Error('UPLOAD_FAILED');
  const {error}=await admin.from('documents').insert({id,case_id:caseId,uploader_id:ctx.user.id,name:file.name.replace(/[\x00-\x1f<>]/g,'').slice(0,180),path,mime,size:file.size,sha256,scan_status:'clean'});
  if(error){await admin.storage.from('case-documents').remove([path]);throw new Error('UPLOAD_FAILED');}
  return {id,name:file.name.slice(0,180)};
}
