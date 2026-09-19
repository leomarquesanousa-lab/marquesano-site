const assert = require('node:assert/strict');
const sharp = require('sharp');
const base = process.argv[2] || 'http://localhost:3100';
const site = 'https://marquesano.com.br';
const routes = ['/', '/servicos', '/portfolio', '/planos', '/sobre', '/contato', '/exemplos/clinica', '/exemplos/barbearia', '/exemplos/comercio', '/exemplos/restaurante', '/exemplos/restaurante/menu', '/exemplos/servicos'];
const required = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
async function main() {
  const assets = new Set(['/favicon.ico', '/og-image.jpg']);
  for (const route of routes) {
    const response = await fetch(base + route, { headers: { 'User-Agent': 'facebookexternalhit/1.1' }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, route);
    const html = await response.text();
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
    assert(head, `${route}: head missing`);
    const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v])));
    const values = {};
    for (const key of required) {
      const matches = tags.filter(tag => tag.property === key || tag.name === key);
      assert.equal(matches.length, 1, `${route}: ${key} missing or duplicate`);
      assert(matches[0].content);
      values[key] = matches[0].content;
    }
    const canonical = tags.filter(tag => tag.rel === 'canonical');
    assert.equal(canonical.length, 1);
    const expected = site + (route === '/' ? '' : route);
    assert.equal(canonical[0].href.replace(/\/$/, ''), expected);
    assert.equal(values['og:url'].replace(/\/$/, ''), expected);
    assert.equal(values['og:site_name'], 'Marquesano');
    assert.equal(values['og:type'], 'website');
    assert.equal(values['og:locale'], 'pt_BR');
    assert.equal(values['twitter:card'], 'summary_large_image');
    assert.equal(values['og:image'], site + '/og-image.jpg');
    assert.equal(values['twitter:image'], values['og:image']);
    assert(!/localhost|127\.0\.0\.1|Marquezano/i.test(tags.map(tag => JSON.stringify(tag)).join('')));
    const icons = tags.filter(tag => ['icon', 'shortcut icon', 'apple-touch-icon'].includes(tag.rel));
    assert.equal(icons.length, 4, `${route}: icon declarations`);
    icons.forEach(icon => assets.add(icon.href));
    console.log(`PASS ${route}: metadata, canonical, social URLs, icons`);
  }
  for (const asset of assets) {
    const response = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, asset);
    assert(response.headers.get('content-type')?.startsWith('image/'), asset);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (asset === '/og-image.jpg') {
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.width, 1200); assert.equal(meta.height, 630);
    }
    assert(bytes.length > 0);
    console.log(`PASS ${asset}: accessible image`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
