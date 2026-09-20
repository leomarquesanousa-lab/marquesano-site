export function currentAttribution() {
  if(typeof window==='undefined')return {};
  const params=new URLSearchParams(window.location.search),touch={landing_page:window.location.pathname};
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])if(params.has(key))touch[key]=params.get(key).slice(0,100);
  try{touch.referrer=new URL(document.referrer).origin;}catch{}
  return touch;
}
export function contactTracked() {
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('marquesano:contact-success'));
}
