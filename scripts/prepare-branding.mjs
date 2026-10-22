// Deterministic extraction from the supplied original JPEGs. No generated/retraced logo.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const input = 'branding-input';
const output = 'public/branding';
await mkdir(output, { recursive: true });
await mkdir('test-results/branding', { recursive: true });
const logoSource = join(input, 'Gemini_Generated_Image_4w6hea4w6hea4w6h.jpg');
const signetSource = join(input, 'Gemini_Generated_Image_1qp58f1qp58f1qp5.jpg');
const bannerSource = join(input, 'Gemini_Generated_Image_zeq83zeq83zeq83z.jpg');

// Estimate the original background independently for every row. Preserve the
// original RGB on opaque surfaces, and unmatte only antialiased edge pixels.
async function extract(source, rectangle, lightForeground) {
  const { data, info } = await sharp(source)
    .extract(rectangle)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const result = Buffer.alloc(width * height * 4);
  const background = new Float32Array(height * 6);
  const distances = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let side = 0; side < 2; side++)
      for (let c = 0; c < 3; c++) {
        const samples = [];
        for (let x = 0; x < 24; x++)
          samples.push(data[(y * width + (side ? width - 1 - x : x)) * 3 + c]);
        samples.sort((a, b) => a - b);
        background[y * 6 + side * 3 + c] = samples[12];
      }
    for (let x = 0; x < width; x++) {
      let distance = 0;
      for (let c = 0; c < 3; c++) {
        const bg =
          background[y * 6 + c] * (1 - x / (width - 1)) +
          (background[y * 6 + 3 + c] * x) / (width - 1);
        distance += (data[(y * width + x) * 3 + c] - bg) ** 2;
      }
      distances[y * width + x] = Math.sqrt(distance);
    }
  }
  const threshold = lightForeground ? 70 : 24;
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const distance = distances[i];
      let alpha = distance < 6 ? 0 : 1;
      const bg = [0, 1, 2].map(
        (c) =>
          background[y * 6 + c] * (1 - x / (width - 1)) +
          (background[y * 6 + 3 + c] * x) / (width - 1),
      );
      if (distance >= 6 && distance < threshold) {
        let nearest = -1,
          best = 999;
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const xx = x + dx,
              yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
            const j = yy * width + xx;
            if (distances[j] >= threshold && dx * dx + dy * dy < best) {
              best = dx * dx + dy * dy;
              nearest = j;
            }
          }
        if (nearest >= 0) {
          let numerator = 0,
            denominator = 0;
          for (let c = 0; c < 3; c++) {
            const f = data[nearest * 3 + c] - bg[c];
            numerator += (data[i * 3 + c] - bg[c]) * f;
            denominator += f * f;
          }
          alpha = Math.max(0, Math.min(1, numerator / (denominator || 1)));
        } else alpha = distance > (lightForeground ? 24 : 9) ? 1 : 0;
      }
      if (alpha < 0.025) alpha = 0;
      for (let c = 0; c < 3; c++)
        result[i * 4 + c] = alpha
          ? Math.max(0, Math.min(255, (data[i * 3 + c] - bg[c] * (1 - alpha)) / alpha))
          : 0;
      result[i * 4 + 3] = Math.round(alpha * 255);
      if (alpha > 0.1) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  const pad = 10;
  return sharp(result, { raw: { width, height, channels: 4 } })
    .extract({
      left: Math.max(0, left - pad),
      top: Math.max(0, top - pad),
      width: Math.min(width - Math.max(0, left - pad), right - left + 1 + pad * 2),
      height: Math.min(height - Math.max(0, top - pad), bottom - top + 1 + pad * 2),
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
const regions = {
  dark: { left: 950, top: 380, width: 840, height: 740 },
  light: { left: 1870, top: 380, width: 840, height: 740 },
};
const assets = {};
for (const [variant, region] of Object.entries(regions)) {
  assets[`logo-${variant}`] = await extract(logoSource, region, variant === 'light');
  assets[`signet-${variant}`] = await extract(
    signetSource,
    { ...region, left: region.left + 120, width: 600, height: 560 },
    variant === 'light',
  );
  for (const kind of ['logo', 'signet'])
    await writeFile(join(output, `rechtavo-${kind}-${variant}.png`), assets[`${kind}-${variant}`]);
}
for (const kind of ['logo', 'signet'])
  await writeFile(join(output, `rechtavo-${kind}-transparent.png`), assets[`${kind}-dark`]);
await sharp(bannerSource)
  .webp({ quality: 84, effort: 6 })
  .toFile(join(output, 'rechtavo-hero.webp'));

async function icon(size) {
  const signet = await sharp(assets['signet-light'])
    .resize(
      size - Math.max(2, Math.round(size * 0.14)),
      size - Math.max(2, Math.round(size * 0.14)),
      { fit: 'inside' },
    )
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: '#0D1B2A' } })
    .composite([{ input: signet, gravity: 'centre' }])
    .png()
    .toBuffer();
}
for (const [name, size] of [
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['rechtavo-icon-192.png', 192],
  ['rechtavo-icon-512.png', 512],
])
  await writeFile(join('public', name), await icon(size));
const frames = await Promise.all(
  [16, 32, 48, 64, 256].map(async (size) => ({ size, data: await icon(size) })),
);
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach(({ size, data }, i) => {
  const n = 6 + i * 16;
  header[n] = size === 256 ? 0 : size;
  header[n + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, n + 4);
  header.writeUInt16LE(32, n + 6);
  header.writeUInt32LE(data.length, n + 8);
  header.writeUInt32LE(offset, n + 12);
  offset += data.length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...frames.map((f) => f.data)]));

// Social image uses the supplied banner and unchanged extracted logo.
const logo = await sharp(assets['logo-light']).resize({ width: 210 }).toBuffer();
const text = Buffer.from(
  `<svg width="1200" height="630"><rect width="1200" height="630" fill="#0D1B2A" opacity=".68"/><text x="72" y="305" font-family="Georgia,serif" font-size="65" fill="white">Ihr Recht.</text><text x="72" y="380" font-family="Georgia,serif" font-size="65" fill="white">Unsere Expertise.</text><text x="72" y="455" font-family="Georgia,serif" font-style="italic" font-size="65" fill="#C7CED8">Vollständig digital.</text><text x="75" y="555" font-family="Arial,sans-serif" font-size="20" fill="#C7CED8">Strafrecht · Steuerrecht · IT-Recht · Online-Betrug</text></svg>`,
);
await sharp(bannerSource)
  .resize(1200, 630, { fit: 'cover' })
  .composite([{ input: text }, { input: logo, left: 915, top: 80 }])
  .png({ compressionLevel: 9 })
  .toFile(join(output, 'rechtavo-og.png'));

// Proof sheet on contrasting backgrounds for visual edge inspection.
const proof = sharp({ create: { width: 1280, height: 760, channels: 4, background: '#ffffff' } });
const darkPanel = await sharp({
  create: { width: 640, height: 760, channels: 4, background: '#0D1B2A' },
})
  .png()
  .toBuffer();
await proof
  .composite([
    { input: darkPanel, left: 640, top: 0 },
    {
      input: await sharp(assets['logo-dark']).resize({ width: 430 }).toBuffer(),
      left: 105,
      top: 70,
    },
    {
      input: await sharp(assets['logo-light']).resize({ width: 430 }).toBuffer(),
      left: 745,
      top: 70,
    },
    { input: await icon(16), left: 30, top: 700 },
    { input: await icon(32), left: 65, top: 692 },
    { input: await icon(64), left: 120, top: 676 },
  ])
  .png()
  .toFile('test-results/branding/proof.png');
for (const file of Object.keys(assets)) {
  const m = await sharp(assets[file]).metadata();
  console.log(`${file}: ${m.width} × ${m.height}, alpha=${m.hasAlpha}`);
}
