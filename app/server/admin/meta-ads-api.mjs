import { createHash } from 'node:crypto';
import { InputError, readJson } from './validation.mjs';
import { validAdminRequestOrigin } from './origin.mjs';
import { MetaError, safeMetaError } from './meta.mjs';
import { adsContext, report, proposal, execute } from './meta-ads-service.mjs';
import { aiAvailability, planCampaign, generateImage } from './meta-ads-ai.mjs';
const safeResult=data=>{
  if(!data||typeof data!=='object')return {};
  const out={};for(const k of ['id','copied_campaign_id','copied_adset_id','copied_ad_id','request_id'])if(typeof data[k]==='string'&&/^[\w-]{1,120}$/.test(data[k]))out[k]=data[k];
  if(typeof data.success==='boolean')out.success=data.success;
  for(const k of ['campaign','adset','creative','ad'])if(data[k])out[k]=safeResult(data[k]);
  return out;
};
export async function metaAdsOperations(request,path,user,repository,{env=process.env,fetcher=fetch}={}) {
  if(!['OWNER','ADMIN'].includes(user?.role))throw new InputError('Acesso não permitido.',403);
  if(!['GET','POST','PATCH'].includes(request.method))throw new InputError('Método não permitido.',405);
  if(request.method!=='GET'&&!validAdminRequestOrigin(request,env))throw new InputError('Origem inválida.',403);
  try {
    const ctx=await adsContext(repository,env,fetcher),store=repository.metaAds,action=path.join('/'),account=ctx.account.id;
    if(request.method==='GET') {
      if(action==='status')return {account:ctx.account,read:ctx.read,manage:ctx.manage,expiresAt:ctx.expiresAt,ai:aiAvailability(env)};
      if(action==='drafts')return {rows:await store.drafts(account)};
      if(action==='images')return {rows:await store.images(account)};
      if(action==='history')return {rows:await store.history(account)};
      if(action==='locations') {
        const q=new URL(request.url).searchParams.get('q')||'';
        if(q.trim().length<3||q.length>100)throw new InputError('Digite pelo menos três caracteres da localização.');
        return {rows:(await ctx.client.list('search',{type:'adgeolocation',location_types:JSON.stringify(['city','region']),q})).rows};
      }
      if(action==='assets') {
        const result={};for(const [key,edge,fields] of [['pages','me/accounts','id,name'],['pixels',account+'/adspixels','id,name'],['audiences',account+'/saved_audiences','id,name,targeting'],['conversions',account+'/customconversions','id,name,custom_event_type']]){
          try{result[key]=(await ctx.client.list(edge,{fields})).rows;}catch{result[key]=null;}
        }
        for(const [key,fields] of [['campaigns','id,name'],['adsets','id,name,campaign_id'],['adcreatives','id,name']]) {try{result[key]=(await ctx.client.list(account+'/'+key,{fields})).rows;}catch{result[key]=null;}}
        return result;
      }
      if(action==='events') {
        const pixel=new URL(request.url).searchParams.get('pixel');const pixels=await ctx.client.list(account+'/adspixels',{fields:'id'});
        if(!pixels.rows.some(p=>p.id===pixel))throw new InputError('Pixel não disponível nesta conta.',403);
        return {rows:(await ctx.client.list(pixel+'/stats',{aggregation:'event'})).rows};
      }
      if(!action||action==='report')return await report(ctx,new URL(request.url).searchParams);
      throw new InputError('Não encontrado.',404);
    }
    const data=await readJson(request,action==='upload'?8*1024*1024:80000);
    if(action==='sync') {const result=await report(ctx,new URL(request.url).searchParams);await store.snapshot(account,result);return result;}
    if(action==='drafts') {
      if(typeof data.name!=='string'||!data.name.trim()||data.name.length>200)throw new InputError('Informe um nome para o rascunho.');
      // Only campaign form fields and AI planning text, never arbitrary credentials.
      const allowed=['name','objective','daily_budget','landing_page','text','title','description','cta','page_id','lead_form_id','image_hash','pixel_id','event','targeting','optimization_goal','start_time','end_time','special_ad_categories','url_tags','planning','existing_campaign_id','existing_adset_id','creative_only'];
      if(Object.keys(data).some(k=>!allowed.includes(k)))throw new InputError('Campo inválido no rascunho.');
      return store.saveDraft(account,data,user);
    }
    if(action==='assistant') {const planning=await planCampaign(data,env,fetcher);const draft={name:String(data.product).slice(0,200),planning};return {...await store.saveDraft(account,draft,user),planning};}
    if(action==='generate-image')return await generateImage(data,env,fetcher);
    if(!ctx.manage)throw new InputError('Autorize o gerenciamento de anúncios nas configurações da Meta.',403);
    if(action==='prepare') {
      const p=await proposal(ctx,data);return store.prepare(account,user,p.action,data.resource,p.before,{...p.after,connection_revision:ctx.revision});
    }
    if(action==='execute') {
      if(data.confirmed!==true)throw new InputError('Confirmação humana obrigatória.');
      const entry=await store.claim(account,user,data.confirmation);let progress={};
      if(entry.after.connection_revision!==ctx.revision){await store.finish(entry,'CANCELLED',{});throw new InputError('A conexão mudou. Revise novamente.',409);}
      try {const result=await execute(ctx,entry,async partial=>{progress=safeResult(partial);await store.finish(entry,'PROCESSING',progress);});const safe=safeResult(result);await store.finish(entry,'SUCCEEDED',safe);return {ok:true,result:safe};}
      catch(error){await store.finish(entry,'UNKNOWN',{...progress,error_code:safeMetaError(error).code,request_id:error.requestId||null});throw new InputError('A operação não foi concluída com confirmação. Consulte o histórico e sincronize a Meta antes de repetir; recursos parciais permanecem pausados.',502);}
    }
    if(action==='upload') {
      if(typeof data.bytes!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.bytes)||data.bytes.length>7*1024*1024)throw new InputError('Envie uma imagem PNG ou JPEG de até 5 MB.');
      const bytes=Buffer.from(data.bytes,'base64');
      if(bytes.length>5*1024*1024||bytes.length<16||!(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||bytes[0]===255&&bytes[1]===216&&bytes[2]===255))throw new InputError('Imagem inválida. Use PNG ou JPEG.');
      if(!['1:1','9:16','horizontal'].includes(data.format)||typeof data.name!=='string'||data.name.length>200)throw new InputError('Informe nome e formato.');
      if(data.origin&&!['upload','ai','storage'].includes(data.origin)||data.prompt!=null&&(typeof data.prompt!=='string'||data.prompt.length>4000))throw new InputError('Metadados inválidos.');
      const record=await store.reserveImage(account,{name:data.name,format:data.format,origin:data.origin,prompt:data.prompt,hash:createHash('sha256').update(bytes).digest('hex')});
      if(record.existing){if(record.status!=='READY')throw new InputError('Upload anterior sem confirmação. Confira a biblioteca da Meta antes de repetir.',409);return record;}
      const result=await ctx.client.post(account+'/adimages',{bytes:data.bytes});const image=Object.values(result.images||{})[0];
      if(!/^[a-f0-9]{32,128}$/i.test(image?.hash||''))throw new InputError('A Meta não confirmou a imagem.',502);
      const url=typeof image.url==='string'&&image.url.startsWith('https://')?image.url:null;
      await store.finishImage(record.id,image.hash,url);await repository.audit(user,'meta_image_uploaded','meta-ads',record.id);return {id:record.id,meta_hash:image.hash,url};
    }
    throw new InputError('Não encontrado.',404);
  }catch(error){if(error instanceof InputError)throw error;const safe=safeMetaError(error);if(error instanceof MetaError)throw new InputError(safe.message,safe.status);throw new InputError('Não foi possível concluir a operação Meta Ads.',502);}
}
