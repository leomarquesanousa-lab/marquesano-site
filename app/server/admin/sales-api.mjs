import { InputError, readJson } from './validation.mjs';
import { confirmedResources } from './mercadopago-webhook.mjs';

export async function salesOperations(request,path,user,repository,{env=process.env,fetcher=fetch}={}) {
  if(!['OWNER','ADMIN'].includes(user.role))throw new InputError('Acesso não permitido.',403);
  if(path.length>1)throw new InputError('Rota inválida.',404);
  if(request.method==='GET') {
    if(path[0]==='resumo')return repository.sales.summary();
    if(path[0])return repository.sales.detail(path[0]);
    const params=new URL(request.url).searchParams;
    return {...await repository.sales.list(params),summary:await repository.sales.summary(),upcoming:await repository.sales.upcoming(params)};
  }
  if(request.method!=='POST'||path[0]!=='sync')throw new InputError('Método não permitido.',405);
  if(!env.MERCADOPAGO_ACCESS_TOKEN)throw new InputError('Mercado Pago não configurado.',503);
  const body=await readJson(request,2048),after=body.after||'',offset=body.offset||0;
  if(typeof after!=='string'||after.length>100||!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new InputError('Cursor inválido.');
  const known=await repository.sales.known(after),subscription=known[0];
  const result={verified:0,updated:0,new_payments:0,errors:[],next:null};
  if(!subscription)return result;
  const options={env,fetcher,signal:AbortSignal.timeout(45000)};
  try {
    if(offset===0) {
      result.verified=1;
      const resources=await confirmedResources('subscription_preapproval',subscription.id,repository.billing,options);
      if(resources.ignored)throw new InputError('Plano da assinatura não está vinculado ao catálogo.',409);
      const applied=await repository.billing.apply(resources);
      if(!applied.duplicate)result.updated++;
    }
    const query=new URLSearchParams({preapproval_id:subscription.id,limit:'5',offset:String(offset)});
    const response=await fetcher('https://api.mercadopago.com/authorized_payments/search?'+query,{headers:{Authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`},signal:options.signal,cache:'no-store',redirect:'error'});
    if(!response.ok)throw new InputError('Consulta de cobranças indisponível.',502);
    const found=await response.json();
    if(!Array.isArray(found.results))throw new InputError('Resposta de cobranças inválida.',502);
    for(const row of found.results) {
      if(!/^[a-zA-Z0-9_-]{1,100}$/.test(String(row.id)))throw new InputError('Identificador de cobrança inválido.',502);
      const resources=await confirmedResources('subscription_authorized_payment',String(row.id).toLowerCase(),repository.billing,options);
      if(resources.ignored||resources.subscription?.id!==subscription.id)throw new InputError('Cobrança de outra assinatura.',502);
      const applied=await repository.billing.apply(resources);
      if(applied.new_payment)result.new_payments++;
    }
    if(found.results.length && (Number.isFinite(Number(found.paging?.total)) ? offset+found.results.length<Number(found.paging.total) : found.results.length>=5)) result.next={after,offset:offset+found.results.length};
    else result.next=known.length>1?{after:subscription.id,offset:0}:null;
  } catch {
    // Never expose arbitrary upstream exception messages or resource payloads.
    result.errors.push({subscription_id:subscription.id,message:'Não foi possível concluir a atualização desta assinatura. Tente sincronizar novamente.'});
    result.next=known.length>1?{after:subscription.id,offset:0}:null;
  }
  await repository.billing.notifications.dispatch({env,fetcher,limit:5}).catch(()=>console.error('SALES_EMAIL_DISPATCH_FAILED'));
  await repository.audit(user,'sync','vendas',subscription.id);
  return result;
}
