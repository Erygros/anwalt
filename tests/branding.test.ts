import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { BRAND } from '../src/lib/branding';
import manifest from '../src/app/manifest';

test('both extracted logo and signet variants have real alpha and transparent margins', async () => {
  for (const kind of ['logo', 'signet'])
    for (const variant of ['dark', 'light', 'transparent']) {
      const path = `public/branding/rechtavo-${kind}-${variant}.png`;
      const { data, info } = await sharp(path)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 4, path);
      assert.ok(info.width < 850 && info.height < 750, 'Only one variant, without captions');
      const alpha = Array.from({ length: info.width * info.height }, (_, n) => data[n * 4 + 3]);
      assert.ok(
        alpha.some((value) => value === 0),
        'Background removed',
      );
      assert.ok(
        alpha.some((value) => value === 255),
        'Original opaque surfaces retained',
      );
      assert.ok(
        alpha.some((value) => value > 0 && value < 255),
        'Antialiasing retained',
      );
      assert.equal(alpha[0], 0, 'Transparent corner');
      assert.equal(alpha[info.width - 1], 0, 'Transparent corner');
      assert.equal(alpha.at(-1), 0, 'Transparent corner');
    }
});
test('favicon contains genuine 16, 32, 48, 64 and 256 pixel image frames', async () => {
  const ico = await readFile('public/favicon.ico');
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 5);
  const sizes = [];
  for (let n = 0; n < 5; n++) {
    const entry = 6 + 16 * n;
    sizes.push(ico[entry] || 256);
    const offset = ico.readUInt32LE(entry + 12);
    assert.deepEqual([...ico.subarray(offset, offset + 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  assert.deepEqual(sizes, [16, 32, 48, 64, 256]);
});
test('all public brand paths exist and banner retains its original aspect ratio', async () => {
  for (const path of Object.values(BRAND.assets))
    assert.ok((await stat(`public${path}`)).size > 0, path);
  const hero = await sharp(`public${BRAND.assets.hero}`).metadata();
  assert.equal(hero.width, 2752);
  assert.equal(hero.height, 1536);
  assert.ok((await stat(`public${BRAND.assets.hero}`)).size < 150000, 'Optimized hero payload');
  assert.equal((await sharp(`public${BRAND.assets.apple}`).metadata()).width, 180);
});
test('manifest consistently uses RECHTAVO and only the supplied signet icons', () => {
  const result = manifest();
  assert.equal(result.name, BRAND.name);
  assert.equal(result.theme_color, '#0D1B2A');
  assert.deepEqual(
    result.icons?.map((icon) => icon.src),
    [BRAND.assets.app192, BRAND.assets.app512],
  );
});
