import { createSign, createHash } from 'node:crypto';
const tokenCache = new Map();
const googleEnv = env => ({ ...env, GOOGLE_CLIENT_EMAIL: env.GOOGLE_CLIENT_EMAIL?.trim() || env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() });
export async function testGoogleConnection(provider, settings, period, options) {
  const result=await googleReport(provider,settings,period,options);
  const name=provider==='ga4'?'Google Analytics':'Search Console';
  if(result.status==='Ativo')return {ok:true,status:'Conectado',message:`${name} conectado com sucesso`};
  return {ok:false,status:result.status==='Não configurado'?'Não conectado':'Erro',code:result.code,message:result.message||`${name} não conectado. Confira os campos salvos e a Service Account no servidor.`};
}
// Only allowlisted diagnostic messages leave the server, never Google's raw response.
const diagnostics={
  API_DISABLED:'API do Search Console desabilitada no projeto da Service Account. Habilite a Google Search Console API no Google Cloud.',
  ACCESS_DENIED:'A Service Account não tem acesso a esta propriedade. Adicione-a em Configurações → Usuários e permissões do Search Console.',
  PROPERTY_MISMATCH:'A propriedade configurada difere da propriedade autorizada. Confira se o acesso é ao domínio sc-domain:marquesano.com.br ou a uma propriedade de URL.',
  PROPERTY_INVALID:'Propriedade inválida. Use sc-domain:marquesano.com.br ou a URL exata cadastrada no Search Console.',
  PROPERTY_NOT_FOUND:'Propriedade não encontrada. Confira o identificador no Search Console e o acesso da Service Account.',
  TOKEN_INVALID:'O Google recusou o token. Confira a credencial da Service Account e o relógio do servidor.',
  SCOPE_INVALID:'O token não tem o escopo necessário para o Search Console. É necessário webmasters.readonly.',
  RATE_LIMIT:'Limite de consultas do Google atingido. Aguarde e tente novamente.'
};
async function providerError(response,provider,auth=false) {
  const body=await response.json().catch(()=>({}));
  const reasons=[body.error?.status,...(body.error?.errors||[]).map(e=>e.reason),...(body.error?.details||[]).map(e=>e.reason)].filter(v=>typeof v==='string');
  const message=typeof body.error?.message==='string'?body.error.message:'';
  let code=auth||response.status===401?'TOKEN_INVALID':null;
  if(provider==='gsc') {
    if(reasons.some(r=>/SERVICE_DISABLED|accessNotConfigured|serviceDisabled/i.test(r))||/has not been used|is disabled/i.test(message))code='API_DISABLED';
    else if(reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT'))code='SCOPE_INVALID';
    else if(response.status===404)code='PROPERTY_NOT_FOUND';
    else if(response.status===400)code='PROPERTY_INVALID';
    else if(response.status===403)code='ACCESS_DENIED';
  }
  if(response.status===429||reasons.some(r=>/rateLimitExceeded|quotaExceeded|RESOURCE_EXHAUSTED/.test(r)))code='RATE_LIMIT';
  return Object.assign(Error('Google request failed'),{auth:auth||[401,403].includes(response.status),httpStatus:response.status,code});
}
export function integrationStatus(settings, env=process.env) {
  env=googleEnv(env);
  const credentials=Boolean(env.GOOGLE_CLIENT_EMAIL&&env.GOOGLE_PRIVATE_KEY);
  return {ga4:{status:settings.GA4_PROPERTY_ID&&credentials?'Configurado':'Não configurado',tracking:!!settings.GA4_MEASUREMENT_ID&&settings.TRACKING_ENABLED==='true'&&!settings.GTM_CONTAINER_ID},gsc:{status:settings.GSC_SITE_URL&&credentials?'Configurado':'Não configurado'},gtm:{status:settings.GTM_CONTAINER_ID?'Configurado':'Não conectado'},credentialsPresent:credentials};
}
async function token(scope,env,fetcher) {
  const key=createHash('sha256').update(scope+env.GOOGLE_CLIENT_EMAIL+env.GOOGLE_PRIVATE_KEY).digest('hex');
  const cached=tokenCache.get(key);if(cached&&cached.until>Date.now())return cached.value;
  const at=Math.floor(Date.now()/1000),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const assertion=[encode({alg:'RS256',typ:'JWT'}),encode({iss:env.GOOGLE_CLIENT_EMAIL,scope,aud:'https://oauth2.googleapis.com/token',iat:at,exp:at+3600})].join('.');
  const signer=createSign('RSA-SHA256');signer.update(assertion);signer.end();
  const signature=signer.sign(env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),'base64url');
  const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:assertion+'.'+signature}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw await providerError(response,null,true);
  const data=await response.json();if(!data.access_token)throw Object.assign(Error('Authentication'),{auth:true});
  if(tokenCache.size>10)tokenCache.clear();tokenCache.set(key,{value:data.access_token,until:Date.now()+Math.min(Number(data.expires_in)||3600,3600)*1000-60000});return data.access_token;
}
export async function googleReport(provider,settings,period,{env=process.env,fetcher=fetch,trace}={}) {
  env=googleEnv(env);
  const prefix=provider==='ga4'?'GA4':'SEARCH_CONSOLE';
  const initial=integrationStatus(settings,env)[provider];
  if(initial?.status!=='Configurado') console.info(prefix+'_CONNECTED=false');
  if(provider==='ga4' && trace) {
    console.info('GA4_REQUEST_STARTED');
    if(initial?.status!=='Configurado') {
      console.error('GA4_ERROR_NAME=ConfigurationError');
      console.error('GA4_ERROR_MESSAGE=Propriedade ou credenciais Google ausentes.');
    }
  }
  if(initial?.status!=='Configurado')return {status:'Não configurado',reports:null};
  try {
    const scope=provider==='ga4'?'https://www.googleapis.com/auth/analytics.readonly':'https://www.googleapis.com/auth/webmasters.readonly';
    const access=await token(scope,env,fetcher);
    async function post(url,body) {
      const response=await fetcher(url,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      console.info(prefix+'_HTTP_STATUS=' + response.status);
      if(!response.ok) {
        const error=await providerError(response,provider);
        if(provider==='gsc'&&error.code==='ACCESS_DENIED') {
          // A URL-prefix property and a domain property have separate permissions.
          try {
            const sites=await fetcher('https://www.googleapis.com/webmasters/v3/sites',{headers:{Authorization:`Bearer ${access}`},signal:AbortSignal.timeout(15000)});
            if(sites.ok) {
              const list=await sites.json();
              const entries=(list.siteEntry||[]).filter(s=>s.permissionLevel!=='siteUnverifiedUser');
              const host=value=>{try{return value.startsWith('sc-domain:')?value.slice(10):new URL(value).hostname.replace(/^www\./,'');}catch{return '';}};
              if(!entries.some(s=>s.siteUrl===settings.GSC_SITE_URL)&&entries.some(s=>host(s.siteUrl)===host(settings.GSC_SITE_URL)))error.code='PROPERTY_MISMATCH';
            }
          } catch { /* Keep the original safe diagnostic when the extra check fails. */ }
        }
        throw error;
      }
      const result = await response.json();
      if(provider==='ga4' && trace) console.info('GA4_ROWS=' + (Array.isArray(result.rows) ? result.rows.length : 0));
      return result;
    }
    if(provider==='ga4') {
      const groups={summary:[],timeline:['date'],acquisition:['sessionSource','sessionMedium','sessionCampaignName'],pages:['pagePath'],devices:['deviceCategory'],countries:['country'],events:['eventName']};
      const reports=Object.fromEntries(await Promise.all(Object.entries(groups).map(async([name,dimensions])=>{
        const metrics=name==='events'?['eventCount','keyEvents']:name==='summary'?['activeUsers','sessions','screenPageViews','keyEvents','newUsers','eventCount','sessionKeyEventRate']:['activeUsers','sessions','screenPageViews','keyEvents'];
        const data=await post(`https://analyticsdata.googleapis.com/v1beta/properties/${settings.GA4_PROPERTY_ID}:runReport`,{dateRanges:[{startDate:period.start,endDate:period.end}],dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),limit:name==='timeline'?367:100,...(name==='timeline'?{orderBys:[{dimension:{dimensionName:'date'}}]}:name!=='summary'?{orderBys:[{metric:{metricName:name==='pages'?'screenPageViews':name==='events'?'eventCount':'activeUsers'},desc:true}]}:{})});
        return [name,{columns:[...dimensions,...metrics],rows:(data.rows||[]).map(row=>[...(row.dimensionValues||[]),...(row.metricValues||[])].map(v=>v.value)),rowCount:data.rowCount||0,timeZone:data.metadata?.timeZone}];
      })));
      console.info('GA4_CONNECTED=true');
      return {status:'Ativo',reports,updatedAt:new Date().toISOString()};
    }
    const reports=Object.fromEntries(await Promise.all(Object.entries({summary:[],queries:['query'],pages:['page'],countries:['country'],devices:['device']}).map(async([name,dimensions])=>{
      const data=await post(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(settings.GSC_SITE_URL)}/searchAnalytics/query`,{startDate:period.start,endDate:period.end,dimensions,rowLimit:100});
      return [name,{columns:[...dimensions,'cliques','impressões','CTR','posição'],rows:(data.rows||[]).map(row=>[...(row.keys||[]),row.clicks,row.impressions,row.ctr,row.position])}];
    })));
    console.info('SEARCH_CONSOLE_CONNECTED=true');
    return {status:'Ativo',reports};
  } catch(error) {
    console.info(prefix+'_CONNECTED=false');
    if(error.httpStatus) console.info(prefix+'_HTTP_STATUS='+error.httpStatus);
    const messages={400:'O Google recusou a consulta. Confira o identificador da propriedade e o período.',401:'O Google recusou a autenticação. Confira a Service Account no servidor.',403:'Acesso negado pelo Google. Confira as permissões da Service Account e se a API está habilitada.',404:'Propriedade não encontrada no Google. Confira o identificador salvo.',429:'Limite de consultas do Google atingido. Aguarde e tente novamente.'};
    const message=diagnostics[error.code] || messages[error.httpStatus] || (error.auth?'Confira as credenciais no servidor e o acesso da conta de serviço à propriedade.':['TimeoutError','AbortError'].includes(error.name)?'O Google demorou para responder. Tente novamente.':'Não foi possível consultar a API oficial. Tente novamente.');
    if(provider==='ga4' && trace) {
      if(error.httpStatus) console.info('GA4_HTTP_STATUS=' + error.httpStatus);
      console.error('GA4_ERROR_NAME=' + (['Error','TypeError','RangeError','SyntaxError','TimeoutError','AbortError'].includes(error.name) ? error.name : 'Error'));
      console.error('GA4_ERROR_MESSAGE=' + message);
    }
    return {status:error.auth?'Erro de autenticação':'Erro de conexão',reports:null,code:error.code||'CONNECTION_ERROR',message};
  }
}
