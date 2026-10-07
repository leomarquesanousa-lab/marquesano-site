import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base=process.argv[2]||'http://localhost:3108';
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;/g,"'");
const get=async path=>{const r=await fetch(new URL(path,base),{signal:AbortSignal.timeout(30000)});return {status:r.status,html:await r.text(),url:r.url};};
const sitemap=await get('/sitemap.xml');
if(sitemap.status!==200||!sitemap.html.includes('<urlset'))throw Error('Sitemap indisponível: HTTP '+sitemap.status);
const urls=[...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
const paths=urls.map(u=>new URL(u).pathname);
const failures=[];const pages=[];const links=new Set();
if(urls.some(u=>!u.startsWith('https://marquesano.com.br')))failures.push('Domínio não canônico no sitemap');
if(new Set(urls).size!==urls.length)failures.push('URLs duplicadas no sitemap');
if(paths.some(p=>/^\/(admin|administracao|api|checkout|assinar|assinatura)(\/|$)|^\/pets\/(login|cadastro|minha-conta|meus-anuncios|publicar)(\/|$)/.test(p)))failures.push('Área privada no sitemap');
for(let offset=0;offset<paths.length;offset+=4){
 await Promise.all(paths.slice(offset,offset+4).map(async path=>{
  const {html,status}=await get(path);
  const meta=name=>decode(html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`))?.[1]||'');
  const title=decode(html.match(/<title>(.*?)<\/title>/)?.[1]||'');
  const canonical=decode(html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1]||'');
  const h1=(html.match(/<h1\b/g)||[]).length;
  const missingAlt=[...html.matchAll(/<img\b[^>]*>/g)].filter(([tag])=>! /\balt=/.test(tag)).length;
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>{try{const s=JSON.parse(m[1]);return (s['@graph']||[s]).map(item=>item['@type']);}catch{failures.push(path+': JSON-LD inválido');return [];}});
  for(const [,href]of html.matchAll(/<a\b[^>]*href="([^"]+)"/g))if(href.startsWith('/'))links.add(decode(href));
  const description=meta('description');
  pages.push({path,status,title,description,canonical,robots:meta('robots'),h1,missingAlt,schemas});
  if(status!==200||!title||!description||canonical!=='https://marquesano.com.br'+(path==='/'?'':path)||h1!==1||missingAlt||/noindex/.test(meta('robots'))||!html.includes('lang="pt-BR"')||!meta('og:title')||!meta('twitter:card'))failures.push(path+': falha em status/metadata/canônico/H1/alt/idioma/indexação');
 }));
}
const duplicateTitles=pages.filter((p,i)=>pages.findIndex(other=>other.title===p.title)!==i).map(p=>p.path);
if(duplicateTitles.length)failures.push('Títulos duplicados: '+duplicateTitles.join(', '));
const duplicateDescriptions=pages.filter((p,i)=>pages.findIndex(other=>other.description===p.description)!==i).map(p=>p.path);
if(duplicateDescriptions.length)failures.push('Descrições duplicadas: '+duplicateDescriptions.join(', '));
const brokenLinks=[];
for(const href of links){const {status}=await get(href);if(status===404||status>=500)brokenLinks.push({href,status});}
if(brokenLinks.length)failures.push('Links internos quebrados');
for(const path of ['/pets/login','/pets/cadastro','/pets/buscar?category=gatos','/pets/pets-perdidos?city=teste']){const {html,status}=await get(path);if(status!==200||!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(html))failures.push(path+': noindex ausente');}
const missingPages=[];
for(const path of ['/pets/pet/anuncio-inexistente-auditoria','/pets/guias/guia-inexistente-auditoria']){const {status,html}=await get(path);const noindex=/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(html);missingPages.push({path,status,noindex});if(status!==404&&!(status===200&&noindex&&html.includes('NEXT_HTTP_ERROR_FALLBACK;404')))failures.push(path+': resposta de página inexistente incorreta');}
const robots=await get('/robots.txt');
for(const path of ['/admin','/api/','/pets/minha-conta'])if(!robots.html.includes('Disallow: '+path))failures.push('Robots não bloqueia '+path);
if(!robots.html.includes('Allow: /api/portal/photos/'))failures.push('Fotos públicas bloqueadas no robots');
const result={pages:pages.sort((a,b)=>a.path.localeCompare(b.path)),sitemapUrls:urls.length,checkedLinks:links.size,brokenLinks,missingPages,failures};
await writeFile(fileURLToPath(new URL('../seo-audit-results.json',import.meta.url)),JSON.stringify(result,null,2));
console.log(JSON.stringify({pages:pages.length,sitemapUrls:urls.length,checkedLinks:links.size,brokenLinks,failures}));
if(failures.length)process.exitCode=1;
