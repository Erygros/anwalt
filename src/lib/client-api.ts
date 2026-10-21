'use client';
export async function post<T=Record<string,unknown>>(path:string,body:unknown):Promise<T> {
  const response=await fetch(`/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error || 'Der Vorgang konnte nicht gespeichert werden.');return data;
}
export const formatDate=(value:string)=>new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeZone:'Europe/Berlin'}).format(new Date(value));
export const formatTime=(value:string)=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(value));
