// Deterministic brand composition; uses the existing logo without redesigning it.
const sharp = require('sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
async function main() {
  const logo = await sharp(path.join(root, 'public/images/logobranco.png')).trim().resize({ width: 500 }).png().toBuffer();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0a1320"/><stop offset="1" stop-color="#123b60"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <path d="M940 0 L1200 260 M1020 0 L1200 180 M860 0 L1200 340" stroke="#82c7e0" stroke-opacity=".12" stroke-width="2"/>
    <rect x="76" y="205" width="56" height="4" rx="2" fill="#8ed1e4"/>
    <g font-family="Arial, sans-serif" fill="#f6f9fc">
      <text x="76" y="292" font-size="58" font-weight="700">Sites profissionais</text>
      <text x="76" y="362" font-size="58" font-weight="700">para sua empresa</text>
      <text x="78" y="430" font-size="28" fill="#bad3e2">A partir de R$ 99/mês</text>
      <text x="78" y="558" font-size="25" fill="#bad3e2">marquesano.com.br</text>
    </g>
    <path d="M78 498 H1122" stroke="#ffffff" stroke-opacity=".16"/>
  </svg>`);
  await sharp(svg).composite([{ input: logo, left: 76, top: 76 }]).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(root, 'public/og-image.jpg'));
  console.log('Created public/og-image.jpg (1200x630)');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
