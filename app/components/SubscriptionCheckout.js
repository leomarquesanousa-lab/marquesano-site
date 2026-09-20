'use client';
import { useRef, useState } from 'react';

export default function SubscriptionCheckout({ plan }) {
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const busy=useRef(false);
  async function checkout() {
    if(busy.current)return;
    busy.current=true;setPending(true);setError('');
    try {
      const response=await fetch('/api/assinaturas/'+plan.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:plan.revision}),signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Não foi possível abrir o checkout.');
      window.location.assign(result.url);
    } catch(e){setError(e.name==='TimeoutError'?'A conexão demorou. Tente novamente.':e.message);busy.current=false;setPending(false);}
  }
  return <><button className="refinedBtn" type="button" disabled={pending} onClick={checkout}>{pending?'Abrindo checkout…':'Assinar '+plan.name+' no Mercado Pago'}</button>{error&&<p role="alert">{error}</p>}</>;
}
