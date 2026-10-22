import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
let scanner, mock, port;
let infected = false;
const token = randomBytes(32).toString('hex');
before(async () => {
  mock = net.createServer((socket) => {
    let data = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      let offset = 10;
      while (data.length >= offset + 4) {
        const n = data.readUInt32BE(offset);
        if (n === 0) {
          socket.end(infected ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
          return;
        }
        offset += 4 + n;
      }
    });
  });
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  scanner = spawn(process.execPath, ['services/scanner/server.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      SCANNER_TOKEN: token,
      CLAMD_HOST: '127.0.0.1',
      CLAMD_PORT: String(mock.address().port),
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  for (let n = 0; n < 50; n++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/scan`);
      if (r.status === 401) return;
    } catch {
      // The scanner can still be starting; retry until the bounded startup deadline.
    }
    await delay(50);
  }
  throw new Error('Scanner did not start');
});
after(async () => {
  scanner?.kill();
  if (mock) await new Promise((resolve) => mock.close(resolve));
});
test('scanner rejects requests without the shared bearer token', async () => {
  const r = await fetch(`http://127.0.0.1:${port}/scan`, { method: 'POST', body: 'test' });
  assert.equal(r.status, 401);
});
test('ClamAV adapter binds the clean verdict to the exact submitted hash', async () => {
  infected = false;
  const body = Buffer.from('Synthetic scanner transport test');
  const r = await fetch(`http://127.0.0.1:${port}/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  assert.equal(r.status, 200);
  const result = await r.json();
  assert.equal(result.clean, true);
  assert.equal(result.sha256, createHash('sha256').update(body).digest('hex'));
});
test('infected verdict never becomes clean', async () => {
  infected = true;
  const r = await fetch(`http://127.0.0.1:${port}/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: 'Synthetic infected response test',
  });
  assert.equal((await r.json()).clean, false);
});
