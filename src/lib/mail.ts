import 'server-only';
import { adminDb } from './supabase/server';
export async function queueMail(userId:string,kind:string,dedupKey:string,reference?:string) {
  const {error}=await adminDb().from('mail_outbox').upsert({ user_id:userId,kind,dedup_key:dedupKey,reference },{onConflict:'dedup_key',ignoreDuplicates:true});
  if(error) throw new Error('OUTBOX_UNAVAILABLE');
}
export async function notify(userId:string,title:string,href:string) { await adminDb().from('notifications').insert({user_id:userId,title,href}); }
export async function flushMail(limit=25) {
  if(!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return {sent:0,configured:false};
  const admin=adminDb(); const {data:items}=await admin.from('mail_outbox').select('*').eq('status','pending').lt('attempts',15).order('created_at').limit(limit);
  let sent=0;
  for(const item of items ?? []) {
    const {data:{user}}=await admin.auth.admin.getUserById(item.user_id); if(!user?.email) continue;
    const ref=item.reference && /^DA-[A-F0-9]{12}$/.test(item.reference) ? ` Ihre Vorgangsnummer: ${item.reference}.` : '';
    const text=item.kind==='intake' ? `Ihre Anfrage ist eingegangen.${ref} Die Kanzlei prüft die Anfrage und mögliche Interessenkonflikte vor einer ausdrücklichen Mandatsannahme. Diese Bestätigung begründet kein Mandat und wahrt keine Fristen.` : item.kind==='appointment_reminder' ? 'Für Sie steht ein Termin an. Uhrzeit, Beratungsart und gegebenenfalls der geschützte Videolink stehen im Mandantenbereich.' : item.kind==='appointment_confirmed' ? 'Ihre Terminbuchung oder Umbuchung wurde gespeichert. Die aktuellen Termindaten finden Sie im Mandantenbereich. Die Buchung allein begründet kein Mandat.' : 'Im Mandantenbereich liegt eine neue Mitteilung für Sie vor.';
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':item.id},body:JSON.stringify({from:process.env.MAIL_FROM,to:[user.email],subject:item.kind==='intake'?'Eingang Ihrer Anfrage':'Mitteilung aus dem Mandantenbereich',text:`${text}\n\n${process.env.NEXT_PUBLIC_SITE_URL}/portal`}),signal:AbortSignal.timeout(10000)}).catch(()=>null);
    await admin.from('mail_outbox').update(res?.ok ? {status:'sent',sent_at:new Date().toISOString(),attempts:item.attempts+1}:{attempts:item.attempts+1}).eq('id',item.id);
    if(res?.ok) sent++;
  }
  return {sent,configured:true};
}
