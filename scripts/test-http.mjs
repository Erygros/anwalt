import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const paths = [
  '/',
  '/rechtsgebiete',
  '/strafrecht',
  '/steuerrecht',
  '/it-recht',
  '/online-betrug',
  '/kanzlei',
  '/ablauf',
  '/kosten',
  '/termin',
  '/kontakt',
  '/faq',
  '/impressum',
  '/datenschutz',
  '/barrierefreiheit',
  '/anfrage',
  '/mandantenbereich',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
];
for (const path of paths) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  if (!path.includes('opengraph')) assert.ok(r.headers.get('x-content-type-options') === 'nosniff');
  console.log(`200 ${path}`);
}
for (const path of ['/portal', '/admin', '/portal/akten', '/admin/einstellungen']) {
  const r = await fetch(base + path, { redirect: 'manual' });
  assert.equal(r.status, 307, path);
  assert.ok(r.headers.get('location')?.includes('/mandantenbereich'));
  console.log(`PROTECTED ${path}`);
}
const missing = await fetch(base + '/nicht-vorhanden');
assert.equal(missing.status, 404);
const csrf = await fetch(base + '/api/messages', {
  method: 'POST',
  headers: { Origin: 'https://untrusted.invalid', 'Content-Type': 'application/json' },
  body: '{}',
});
assert.equal(csrf.status, 403);
console.log('REJECTED cross-origin mutation');
const cron = await fetch(base + '/api/cron');
assert.equal(cron.status, 401);
console.log('PROTECTED cron');
const webhook = await fetch(base + '/api/payments/webhook', { method: 'POST', body: '{}' });
assert.ok([400, 503].includes(webhook.status));
console.log('REJECTED unsigned/unconfigured webhook');
const slots = await fetch(base + '/api/slots');
assert.equal(slots.status, 200);
const data = await slots.json();
assert.ok(Array.isArray(data.slots));
console.log('OK availability response');
const home = await fetch(base);
const csp = home.headers.get('content-security-policy');
assert.ok(csp?.includes("'nonce-"));
assert.ok(!csp?.includes("script-src 'self' 'unsafe-inline'"));
const html = await home.text();
assert.ok(html.includes('nonce='));
console.log('OK nonce-based CSP');
