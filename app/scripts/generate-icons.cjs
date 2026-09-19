// Gera apenas derivados; não altera os PNGs originais.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const publicRoot = path.join(root, 'public');
async function symbol(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 0) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  if (right < left) throw Error('Símbolo sem pixels visíveis');
  // Remove só margens totalmente transparentes nos derivados, preservando todos os pixels do desenho.
  return sharp(buffer).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
}
async function icon(source, size, apple = false) {
  const padding = apple ? 24 : Math.max(1, Math.round(size / 16));
  const inner = await sharp(source).resize(size - padding * 2, size - padding * 2, { fit: 'contain', background: '#00000000' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: apple ? '#ffffff' : '#00000000' } }).composite([{ input: inner, left: padding, top: padding }]).png().toBuffer();
}
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, buffer }, i) => {
    const at = 6 + 16 * i;
    header[at] = size; header[at + 1] = size;
    header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(buffer.length, at + 8); header.writeUInt32LE(offset, at + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, ...images.map(i => i.buffer)]);
}
(async () => {
  const blueSource = fs.readFileSync(path.join(publicRoot, 'images/mazul.png'));
  const whiteSource = fs.readFileSync(path.join(publicRoot, 'images/mbranco.png'));
  const version = crypto.createHash('sha256').update(blueSource).update(whiteSource).update('icons-v1').digest('hex').slice(0, 10);
  const blue = await symbol(blueSource), white = await symbol(whiteSource);
  fs.mkdirSync(path.join(publicRoot, 'icons'), { recursive: true });
  const filenames = { blue: `m-blue-32.${version}.png`, white: `m-white-32.${version}.png`, apple: `apple-touch-180.${version}.png` };
  fs.writeFileSync(path.join(publicRoot, 'icons', filenames.blue), await icon(blue, 32));
  fs.writeFileSync(path.join(publicRoot, 'icons', filenames.white), await icon(white, 32));
  fs.writeFileSync(path.join(publicRoot, 'icons', filenames.apple), await icon(blue, 180, true));
  const images = await Promise.all([16, 32, 48].map(async size => ({ size, buffer: await icon(blue, size) })));
  fs.writeFileSync(path.join(publicRoot, 'favicon.ico'), ico(images));
  const config = {
    icon: [{ url: `/icons/${filenames.blue}`, type: 'image/png', sizes: '32x32' }, { url: `/icons/${filenames.white}`, type: 'image/png', sizes: '32x32', media: '(prefers-color-scheme: dark)' }],
    shortcut: `/favicon.ico?v=${version}`,
    apple: [{ url: `/icons/${filenames.apple}`, sizes: '180x180', type: 'image/png' }]
  };
  fs.writeFileSync(path.join(root, 'app/config/icons.js'), `// Gerado por scripts/generate-icons.cjs.\nexport const siteIcons = ${JSON.stringify(config, null, 2)};\n`);
  console.log(JSON.stringify({ version, files: ['favicon.ico', ...Object.values(filenames)] }));
})().catch(error => { console.error(error); process.exit(1); });
