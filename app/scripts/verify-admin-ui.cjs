// Static component QA only. Fixtures never enter the application or database.
// node app/scripts/verify-admin-ui.cjs [--serve]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),swc=require('next/dist/build/swc');
const root=path.resolve(__dirname,'../admin'),compiled=new Map(),cache=new Map();
let currentPath='/admin/dashboard';
async function main(){
  await swc.loadBindings();
  for(const name of fs.readdirSync(root).filter(name=>name.endsWith('.js'))){
    const filename=path.join(root,name),source=fs.readFileSync(filename,'utf8');
    for(const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g))require.resolve(path.resolve(root,match[1]));
    compiled.set(filename,(await swc.transform(source,{filename,jsc:{parser:{syntax:'ecmascript',jsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}})).code);
  }
  const css=fs.readFileSync(path.join(root,'admin.module.css'),'utf8');require('postcss').parse(css);
  function load(filename){
    if(cache.has(filename))return cache.get(filename).exports;
    const module={exports:{}};cache.set(filename,module);
    const localRequire=id=>id.endsWith('.css')?{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}:id==='next/navigation'?{usePathname:()=>currentPath}:id.startsWith('.')?load(require.resolve(path.resolve(path.dirname(filename),id))):require(id);
    vm.runInThisContext('(function(require,module,exports){'+compiled.get(filename)+'\n})',{filename})(localRequire,module,module.exports);
    return module.exports;
  }
  const {OverviewSection,AnalyticsSection}=load(path.join(root,'report-sections.js'));
  const Seo=load(path.join(root,'seo-section.js')).default,Settings=load(path.join(root,'settings-integrations.js')).default,Marketing=load(path.join(root,'marketing-section.js')).default,{AdminShell}=load(path.join(root,'ui.js'));
  const {metaStatus}=await import('../server/admin/meta.mjs');
  const {seoDiagnostics}=await import('../server/seo.mjs');
  const {integrationStatus}=await import('../server/admin/google.mjs');
  const settings={GA4_PROPERTY_ID:'123',GA4_MEASUREMENT_ID:'G-TEST1',GSC_SITE_URL:'sc-domain:marquesano.com.br',TRACKING_ENABLED:'true',GTM_CONTAINER_ID:''};
  const integrations=integrationStatus(settings,{GOOGLE_CLIENT_EMAIL:'fixture',GOOGLE_PRIVATE_KEY:'fixture'});
  const report=(columns,rows)=>({columns,rows,rowCount:rows.length});
  const fixture={period:{start:'2026-09-14',end:'2026-09-20'},counts:{visitors:0,page_views:0,forms:0},pages:[],events:[],traffic:[],settings,integrations,meta:metaStatus({}),google:{status:'Ativo',reports:{
    summary:report(['activeUsers','sessions','screenPageViews','keyEvents','newUsers','eventCount','sessionKeyEventRate'],[['1240','1650','3240','62','970','8210','0.035']]),
    timeline:report(['date','activeUsers'],[['20260914','110'],['20260915','170'],['20260916','130'],['20260917','210'],['20260918','180'],['20260919','300'],['20260920','240']]),
    pages:report(['pagePath','screenPageViews'],[['/','1450'],['/planos','820'],['/servicos','600'],['/portfolio','220'],['/contato','150']]),
    devices:report(['deviceCategory','sessions'],[['mobile','1100'],['desktop','480'],['tablet','70']]),
    countries:report(['country','sessions'],[['Brazil','1350'],['United States','180'],['Portugal','120']]),
    acquisition:report(['sessionSource','sessionMedium','sessions'],[['google','organic','900'],['instagram','social','520'],['(direct)','(none)','230']]),
    events:report(['eventName','eventCount'],[['page_view','3240'],['user_engagement','2890'],['scroll','1100'],['form_submit','62']])
  }}};
  const user={email:'qa@example.com',role:'OWNER'};
  const links=[['dashboard','Dashboard'],['analytics','Analytics'],['marketing','Marketing'],['seo','SEO'],['configuracoes','Configurações'],['usuarios','Usuários'],['auditoria','Auditoria']].map(([key,title])=>({href:'/admin/'+key,title}));
  const element=React.createElement;
  const screens={dashboard:()=>element(OverviewSection,{data:fixture,onRefresh(){}}),analytics:()=>element(AnalyticsSection,{data:fixture,onRefresh(){}}),marketing:()=>element(Marketing,{data:{meta:fixture.meta},user}),configuracoes:()=>element(Settings,{data:fixture,user,api:async()=>({})}),seo:()=>element(Seo,{data:{...seoDiagnostics(),integrations,google:{status:'Erro de autenticação',code:'API_DISABLED',message:'API do Search Console desabilitada no projeto da Service Account.'}},onRefresh(){},onDiagnose(){}}),empty:()=>element(AnalyticsSection,{data:{...fixture,google:{status:'Não configurado'}},onRefresh(){}})};
  const pages={};
  const errors=[],originalError=console.error;
  console.error=(...args)=>errors.push(args);
  for(const [name,screen]of Object.entries(screens)){
    currentPath='/admin/'+name;
    const markup=renderToStaticMarkup(element('div',{className:'admin'},element(AdminShell,{user,links},element('div',{className:'pageHeading'},element('span',{className:'eyebrow'},'MARQUESANO / ADMIN'),element('h1',null,name==='dashboard'?'Visão geral':links.find(l=>l.href===currentPath)?.title||'Analytics'),element('p',null,'Prévia de validação com dados de teste.')),element('div',{className:'periodTabs'},...['Hoje','7 dias','30 dias','90 dias'].map(v=>element('button',{key:v,'aria-pressed':v==='7 dias'},v))),screen())));
    assert(!markup.includes('undefined'));assert(!markup.includes('NaN'));assert(!markup.includes('href="/admin/campanhas"'));assert(!markup.includes('href="/admin/leads"'));
    pages[name]='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA '+name+'</title><style>body{margin:0}'+css+'</style><body>'+markup+'</body></html>';
    console.log('PASS imports, exports, SSR: '+name);
  }
  assert(pages.analytics.includes('Tráfego ao longo do tempo'));assert(pages.empty.includes('Dados de dispositivos indisponíveis'));assert(pages.marketing.includes('Não conectado'));
  console.error=originalError;
  assert.equal(errors.length,0,'React reported rendering warnings: '+errors.map(e=>e[0]).join('\n'));
  if(process.argv.includes('--serve')){
    require('node:http').createServer((req,res)=>{const parts=req.url.split('/').filter(Boolean),mobile=parts[0]==='mobile',name=parts[mobile?1:0]||'dashboard';const html=mobile?'<html><body style="margin:0;background:#e7ecf3"><iframe title="Mobile 390px" style="width:390px;height:100vh;border:0" src="/'+name+'"></iframe></body></html>':pages[name];res.writeHead(html?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html||'Not found');}).listen(3198,'127.0.0.1',()=>console.log('Static QA preview: http://127.0.0.1:3198 (no application session or real data)'));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
