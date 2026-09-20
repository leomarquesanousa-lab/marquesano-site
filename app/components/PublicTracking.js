'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { currentAttribution } from './tracking.mjs';

export default function PublicTracking() {
  const path=usePathname(),[config,setConfig]=useState(null),last=useRef(''),started=useRef(false),chain=useRef(Promise.resolve());
  const privatePage=path==='/admin'||path.startsWith('/admin/');
  useEffect(()=>{
    if(privatePage||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
    let active=true;fetch('/api/marketing',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(active)setConfig(data);}).catch(()=>{});return()=>{active=false;};
  },[privatePage]);
  useEffect(()=>{
    if(privatePage||!config?.enabled)return;
    window.dataLayer=window.dataLayer||[];
    if(config.gtm&&!window.marquesanoGtmStarted){window.marquesanoGtmStarted=true;window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});}
    if(config.ga4&&window.marquesanoGaId!==config.ga4){window.marquesanoGaId=config.ga4;window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',config.ga4,{send_page_view:false});}
    function google(name) {
      const details={page_location:window.location.origin+path,page_path:path};
      if(config.gtm)window.dataLayer.push({event:name,...details});
      else if(config.ga4){window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('event',name,details);}
    }
    function event(name) {
      const body=JSON.stringify({id:crypto.randomUUID(),name,path,attribution:currentAttribution()});
      // Serialize requests so the initial response sets the visitor cookie first.
      chain.current=chain.current.catch(()=>{}).then(()=>fetch('/api/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true})).catch(()=>{});
      google(name);
    }
    if(last.current!==path){last.current=path;started.current=false;event('page_view');if(path==='/planos')event('plan_view');if(path==='/portfolio'||path.startsWith('/exemplos/'))event('portfolio_view');if(path==='/servicos')event('service_view');}
    const click=e=>{const link=e.target.closest('a');if(!link)return;const href=link.getAttribute('href')||'';if(/wa\.me|api\.whatsapp\.com/.test(href))event('whatsapp_click');else if(href.startsWith('tel:'))event('phone_click');else if(href.startsWith('mailto:'))event('email_click');else if(link.matches('.primaryBtn,.secondaryBtn,.refinedBtn,.whiteBtn'))event('cta_click');};
    const focus=e=>{if(!started.current&&e.target.closest('.contactForm')&&!path.startsWith('/exemplos/')){started.current=true;event('contact_form_start');}};
    const success=()=>{event('contact_form_submit');google('lead_generated');};
    document.addEventListener('click',click);document.addEventListener('focusin',focus);window.addEventListener('marquesano:contact-success',success);
    return()=>{document.removeEventListener('click',click);document.removeEventListener('focusin',focus);window.removeEventListener('marquesano:contact-success',success);};
  },[path,privatePage,config]);
  if(privatePage||!config?.enabled)return null;
  if(config.gtm)return <Script id="marquesano-gtm" src={`https://www.googletagmanager.com/gtm.js?id=${config.gtm}`} strategy="afterInteractive"/>;
  if(config.ga4)return <Script src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4}`} strategy="afterInteractive"/>;
  return null;
}
