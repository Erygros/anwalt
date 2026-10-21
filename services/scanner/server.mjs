import http from 'node:http';
import net from 'node:net';
import { createHash, timingSafeEqual } from 'node:crypto';
const token = process.env.SCANNER_TOKEN;
if (!token || token.length < 32)
  throw new Error('SCANNER_TOKEN must contain at least 32 characters.');
const maxSize = 10 * 1024 * 1024;
let running = 0;
function scan(bytes) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({
      host: process.env.CLAMD_HOST || 'clamav',
      port: Number(process.env.CLAMD_PORT || 3310),
    });
    let answer = '';
    socket.setTimeout(30000, () => socket.destroy(new Error('timeout')));
    socket.on('error', reject);
    socket.on('data', (chunk) => {
      answer += chunk.toString();
      if (answer.length > 1024) socket.destroy(new Error('invalid response'));
    });
    socket.on('end', () => resolve(answer.replace(/\0/g, '').trim() === 'stream: OK'));
    socket.on('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'));
      for (let i = 0; i < bytes.length; i += 65536) {
        const chunk = bytes.subarray(i, i + 65536);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const supplied = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${token}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.writeHead(401);
    res.end('{"error":"unauthorized"}');
    return;
  }
  if (req.method !== 'POST' || req.url !== '/scan') {
    res.writeHead(404);
    res.end('{}');
    return;
  }
  if (running >= 4) {
    res.writeHead(503);
    res.end('{"error":"busy"}');
    return;
  }
  running++;
  try {
    let length = 0;
    const chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > maxSize) throw new Error('size');
      chunks.push(chunk);
    }
    if (!length) throw new Error('size');
    const bytes = Buffer.concat(chunks);
    const clean = await scan(bytes);
    res.end(JSON.stringify({ clean, sha256: createHash('sha256').update(bytes).digest('hex') }));
  } catch {
    res.writeHead(503);
    res.end('{"error":"scan_unavailable"}');
  } finally {
    running--;
  }
});
server.requestTimeout = 35000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 8788), '0.0.0.0');
