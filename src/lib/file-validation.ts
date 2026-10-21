export function detectMime(b: Buffer): string | null {
  if (b.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (
    !b.includes(0) &&
    !b.toString('utf8').includes('\ufffd') &&
    !/<\s*(?:script|html|svg|!doctype)/i.test(b.toString('utf8'))
  )
    return 'text/plain';
  return null;
}
