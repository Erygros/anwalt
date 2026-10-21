import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  if (code) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(next === '/mandantenbereich?reset=1' ? next : '/mandantenbereich', origin),
      );
  }
  return NextResponse.redirect(new URL('/mandantenbereich?error=callback', origin));
}
