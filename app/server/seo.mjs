import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
export const officialSite='https://marquesano.com.br';
const projectRoot=()=>existsSync(join(process.cwd(),'package.json'))?process.cwd():dirname(process.cwd());
export function publicPages(root=join(projectRoot(),'app')) {
  const pages=[];
  function walk(dir,parts=[]) {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      if(entry.isDirectory()&&!['admin','api','node_modules'].includes(entry.name)&&!entry.name.startsWith('.')&&!entry.name.startsWith('[')&&!entry.name.startsWith('_')&&!entry.name.startsWith('@'))walk(join(dir,entry.name),entry.name.startsWith('(')?parts:[...parts,entry.name]);
      else if(entry.isFile()&&/^page\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const source=readFileSync(join(dir,entry.name),'utf8');const path='/'+parts.join('/');
        const indexable=!/index\s*:\s*false/.test(source);
        pages.push({path,indexable,source});
      }
    }
  }
  walk(root);return pages;
}
export function seoDiagnostics() {
  const pages=publicPages().map(({path,indexable,source})=>{
    const file=join(projectRoot(),'.next/server/app',path==='/'?'index.html':path.slice(1)+'.html');
    const built=existsSync(file),html=built?readFileSync(file,'utf8'):'';
    const meta=(name)=>html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`))?.[1]||'';
    const args=source.match(/pageMetadata\("[^"]+",\s*"([^"]+)",\s*"([^"]+)"/);
    const title=built?(html.match(/<title>(.*?)<\/title>/)?.[1]||''):(args?.[1]||(path==='/'?'Marquesano | Sites Profissionais para Empresas':''));
    const description=built?meta('description'):(args?.[2]||(path==='/'?'Criamos sites modernos, rápidos e responsivos para empresas que querem fortalecer sua presença digital e conquistar mais clientes.':''));
    const canonical=built?(html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1]||''):(source.includes('pageMetadata(')?officialSite+(path==='/'?'':path):'');
    return {path,indexable:built?!/noindex/.test(meta('robots')):indexable,title,description,canonical,missingAlt:built?[...html.matchAll(/<img\b[^>]*>/g)].filter(([tag])=>! /\balt=/.test(tag)).length:null,h1:built?(html.match(/<h1\b/g)||[]).length:null,structuredData:built?html.includes('application/ld+json'):null,checked:built?'HTML do último build':'Configuração fonte; execute build para auditar HTML'};
  });
  return {domain:officialSite,canonical:officialSite,robots:'/robots.txt',sitemap:'/sitemap.xml',pages,total:pages.length,indexable:pages.filter(p=>p.indexable).length,noindex:pages.filter(p=>!p.indexable).length,missingTitle:pages.filter(p=>!p.title).length,missingDescription:pages.filter(p=>!p.description).length,missingCanonical:pages.filter(p=>!p.canonical).length};
}
export async function publishedSeoStatus(fetcher=fetch) {
  const rows=await Promise.all(['/robots.txt','/sitemap.xml'].map(async path=>{
    try {const response=await fetcher(officialSite+path,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000)});return [path,{status:response.status,ok:response.ok,url:officialSite+path}];}
    catch{return [path,{status:null,ok:false,url:officialSite+path}];}
  }));return Object.fromEntries(rows);
}
