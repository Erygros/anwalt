import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectMime } from '../src/lib/file-validation';
import { intakeSchema, firmSchema } from '../src/lib/validation';
import { defaultFirm, isFirmComplete } from '../src/lib/firm';
test('file inspection rejects HTML, SVG and executable bytes', () => {
  for (const b of [
    Buffer.from('<html><script>bad</script></html>'),
    Buffer.from('<svg onload="bad">'),
    Buffer.from([0x4d, 0x5a, 0, 1]),
  ])
    assert.equal(detectMime(b), null);
  assert.equal(detectMime(Buffer.from('%PDF-1.7\n')), 'application/pdf');
  assert.equal(detectMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.equal(detectMime(Buffer.from('A plain text letter.')), 'text/plain');
});
test('intake requires acknowledgement, opponent and sufficiently described facts', () => {
  const valid = {
    practice: 'it-recht',
    subject: 'Softwarevertrag prüfen',
    urgency: 'normal',
    facts: 'Ein längerer, rein synthetischer Sachverhalt zum Test.',
    deadline: null,
    opponent: 'Unbekannt',
    fullName: 'Test Person',
    phone: '',
    company: '',
    acknowledged: true,
  };
  assert.equal(intakeSchema.safeParse(valid).success, true);
  for (const patch of [
    { acknowledged: false },
    { opponent: '' },
    { facts: 'kurz' },
    { practice: 'arbitrary' },
  ])
    assert.equal(intakeSchema.safeParse({ ...valid, ...patch }).success, false);
});
test('unconfigured firm cannot be launched and negative prices cannot be published', () => {
  assert.equal(isFirmComplete(defaultFirm), false);
  assert.equal(
    firmSchema.safeParse({
      ...defaultFirm,
      services: [
        { id: 'test', title: 'Test', description: 'A test description', amount: -1, taxRate: 19 },
      ],
    }).success,
    false,
  );
});
