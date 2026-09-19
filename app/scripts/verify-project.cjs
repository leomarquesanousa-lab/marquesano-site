const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'..'));
const base=process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const expected=['/','/servicos','/portfolio','/planos','/sobre','/contato','/exemplos/clinica','/exemplos/barbearia','/exemplos/restaurante','/exemplos/restaurante/menu','/exemplos/comercio','/exemplos/servicos'];
const htmlRoot=path.resolve('../.next/server/app');
const home=fs.readFileSync('page.js','utf8');
const hero=home.match(/      <section className="heroV9">[\s\S]*?<\/section>/)[0];
assert.equal(crypto.createHash('sha256').update(hero).digest('hex'),'5d635e923c375abdba5f126936a3efaeaa2f710e5789aa48a1f11d647b464f16','Hero original foi modificado');
const pages=new Map(expected.map(route=>[route,fs.readFileSync(path.join(htmlRoot,route==='/'?'index.html':route.slice(1)+'.html'),'utf8')]));
let linkCount=0;
for(const [route,html] of pages){
 assert.equal([...html.matchAll(/<h1[ >]/g)].length,1,`${route}: título principal único`);
 assert(!html.includes('5500000000000'),`${route}: telefone fictício removido`);
 for(const [,href] of html.matchAll(/<a\b[^>]*\bhref="([^"<>]*)"/g)){
  if(!href.startsWith('/')&&!href.startsWith('#'))continue;
  if(href.startsWith('/_next')||href.startsWith('//'))continue;
  const url=new URL(href,`http://local${route}`);
  assert(pages.has(url.pathname),`${route}: rota ausente ${href}`);
  if(url.hash){
   const id=decodeURIComponent(url.hash.slice(1));
   assert(pages.get(url.pathname).includes(`id="${id}"`),`${route}: destino ausente ${href}`);
  }
  linkCount++;
 }
 for(const [,pattern] of html.matchAll(/pattern="([^"]+)"/g)) new RegExp(pattern.replaceAll('&amp;','&'),'v');
 assert(html.includes('https://wa.me/5511940702998'),`${route}: WhatsApp global ausente`);
 for(const match of html.matchAll(/<a\b[^>]*href="https:\/\/wa.me\/[^>]+>/g)) {
  assert(match[0].includes('href="https://wa.me/5511940702998"'),`${route}: WhatsApp divergente`);
  assert(match[0].includes('target="_blank"'),`${route}: WhatsApp sem nova aba`);
 }
 if (!route.startsWith('/exemplos/')) {
  assert(html.includes('marquesanoFooter'),`${route}: rodapé principal ausente`);
  assert(html.includes('© 2026 Marquesano. Todos os direitos reservados.'),`${route}: copyright ausente`);
 }
}
for(const category of ['Entradas','Massas','Carnes','Peixes','Sobremesas','Vinhos','Coquetéis']) assert(pages.get('/exemplos/restaurante/menu').includes(category));
console.log(`Hero preservado; ${pages.size} rotas renderizadas; ${linkCount} links e âncoras internos verificados; 7 categorias no menu.`);
(async()=>{
 const results=await Promise.all(expected.map(async route=>{const r=await fetch(base+route);assert.equal(r.status,200,route);return route;}));
 console.log(`${results.length} rotas HTTP responderam 200.`);
 const images=[...new Set([...pages.values()].flatMap(html=>[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'))))];
 await Promise.all(images.map(async url=>{const r=await fetch(new URL(url,base),{method:'HEAD'});assert.equal(r.status,200,url);}));
 console.log(`${images.length} imagens externas acessíveis; padrões de formulário válidos.`);
 const iconLinks=[...pages.get('/').matchAll(/<link\b[^>]*rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>/g)];
 assert.equal(iconLinks.length,4,'Configuração única: dois PNGs, shortcut ICO e Apple Touch');
 for(const [tag] of iconLinks) {
  const href=tag.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&');
  const response=await fetch(new URL(href,base));
  assert.equal(response.status,200,href);
  assert(response.headers.get('content-type').startsWith('image/'),href);
 }
 console.log('WhatsApp, footer e quatro declarações de ícones verificados.');
})().catch(e=>{console.error(e);process.exit(1)});
