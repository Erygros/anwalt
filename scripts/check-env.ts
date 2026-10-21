import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { defaultFirm, isFirmComplete } from '../src/lib/firm';
async function main() {
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const required = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'MAIL_FROM',
    'RATE_LIMIT_SECRET',
    'CRON_SECRET',
  ];
  let failed = false;
  for (const name of required) {
    const ok = !!process.env[name];
    console.log(`${ok ? 'OK' : 'MISSING'} ${name}`);
    if (!ok) failed = true;
  }
  if ((process.env.RATE_LIMIT_SECRET?.length ?? 0) < 32) {
    console.log('INVALID RATE_LIMIT_SECRET: at least 32 characters required');
    failed = true;
  }
  for (const name of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'MALWARE_SCAN_URL']) {
    const value = process.env[name];
    if (!value) continue;
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1')
        throw new Error();
    } catch {
      console.log(`INVALID ${name}: HTTPS URL required`);
      failed = true;
    }
  }
  for (const names of [
    ['MALWARE_SCAN_URL', 'MALWARE_SCAN_TOKEN'],
    ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  ]) {
    const count = names.filter((n) => process.env[n]).length;
    if (count === 1) {
      console.log(`INCOMPLETE ${names.join(' + ')}`);
      failed = true;
    } else console.log(`${count ? 'CONFIGURED' : 'DISABLED'} ${names.join(' + ')}`);
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', 'firm')
      .maybeSingle();
    if (error || !isFirmComplete({ ...defaultFirm, ...data?.value })) {
      console.log('INCOMPLETE verified firm data / database migrations');
      failed = true;
    } else console.log('OK required firm fields present (content must be reviewed by firm)');
  }
  console.log(`FIRM_LIVE ${process.env.FIRM_LIVE === 'true' ? 'enabled' : 'disabled'}`);
  process.exitCode = failed ? 1 : 0;
}
main().catch(() => {
  console.error('Configuration verification failed; no secrets were printed.');
  process.exitCode = 1;
});
