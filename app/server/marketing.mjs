import { adminStore, configured } from './admin/core.mjs';
import { text, publicPath, readJson, InputError, isInputError } from './admin/validation.mjs';
import { NextResponse } from 'next/server.js';
export const visitorCookie = () => process.env.NODE_ENV==='production'?'__Host-marquesano_visitor':'marquesano_visitor';
export function attribution(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))return {};
  const clean={};
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {const v=text(input[key],100);if(v&&!/[@<>\r\n]/.test(v))clean[key]=v;}
  clean.landing_page=publicPath(input.landing_page||'/');
  try { const u=new URL(input.referrer);if(['http:','https:'].includes(u.protocol)&&!['marquesano.com.br','www.marquesano.com.br'].includes(u.hostname))clean.referrer=u.origin; } catch {}
  return clean;
}
export function contactPersistence() {
  return {
    capture(clean,key,request,data) {
      if(!configured())return null; // Keep existing email service usable before admin setup.
      const cookie=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(visitorCookie()+'='))?.split('=')[1];
      let touch={};try{touch=attribution(data.attribution);}catch{}
      return adminStore().repository.captureContact(clean,key,cookie,touch);
    },
    sent(record,id) { if(record)adminStore().repository.emailStatus(record.id,'SENT',id); },
    failed(record) { if(record)adminStore().repository.emailStatus(record.id,'FAILED'); },
    unknown(record) { if(record)adminStore().repository.emailStatus(record.id,'UNKNOWN'); }
  };
}
export async function marketingRequest(request) {
  const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
  try {
    if(!configured())return reply(request.method==='GET'?{enabled:false,gtm:'',ga4:''}:{ok:false},request.method==='GET'?200:503);
    const repo=adminStore().repository,settings=repo.settings();
    const enabled=settings.TRACKING_ENABLED==='true';
    const gtm=/^GTM-[A-Z0-9]{4,20}$/.test(settings.GTM_CONTAINER_ID)?settings.GTM_CONTAINER_ID:'';
    const ga4=/^G-[A-Z0-9]{4,20}$/.test(settings.GA4_MEASUREMENT_ID)?settings.GA4_MEASUREMENT_ID:'';
    if(request.method==='GET')return reply({enabled,gtm:enabled?gtm:'',ga4:enabled&&!gtm?ga4:''});
    if(!enabled)return reply({ok:false},403);
    if(request.headers.get('origin')!==(process.env.CONTACT_SITE_ORIGIN||'https://marquesano.com.br'))return reply({ok:false},403);
    const data=await readJson(request,3000);
    const names=['page_view','cta_click','whatsapp_click','phone_click','email_click','contact_form_start','contact_form_submit','plan_view','portfolio_view','service_view'];
    if(!names.includes(data.name)||! /^[a-f0-9-]{36}$/.test(data.id||''))throw new InputError();
    const path=publicPath(data.path);
    const visitor=repo.recordEvent(request.cookies.get(visitorCookie())?.value,{id:data.id,name:data.name,path},attribution(data.attribution));
    const response=reply({ok:true});response.cookies.set(visitorCookie(),visitor,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7776000});return response;
  } catch(error) {return reply({ok:false},isInputError(error)?error.status:503);}
}
