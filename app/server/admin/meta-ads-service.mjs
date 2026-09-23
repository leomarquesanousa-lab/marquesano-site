import { metaAccess, MetaError } from './meta.mjs';
import { InputError } from './validation.mjs';
export const fields = {
  campaigns:'id,account_id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time,special_ad_categories',
  adsets:'id,account_id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,start_time,end_time,targeting,optimization_goal,billing_event,bid_amount,promoted_object',
  ads:'id,account_id,campaign_id,adset_id,name,status,effective_status,creative{id,name,thumbnail_url,object_story_spec,title,body,url_tags}'
};
export const insightFields='campaign_id,adset_id,ad_id,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values,conversions,cost_per_action_type';
const id=value=>{if(!/^\d{1,40}$/.test(String(value||'')))throw new InputError('Selecione um recurso válido.');return String(value);};
const string=(v,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new InputError('Preencha os campos obrigatórios.');return v.trim();};
export const safeUrl=value=>{let u;try{u=new URL(value);}catch{throw new InputError('Informe uma URL HTTPS válida.');}if(u.protocol!=='https:'||u.username||u.password)throw new InputError('Informe uma URL HTTPS válida.');return u.href;};
const amount=v=>{if(!Number.isSafeInteger(v)||v<=0||v>100000000)throw new InputError('Orçamento inválido. Use centavos.');return v;};
function dates(data,target) {for(const key of ['start_time','end_time','stop_time'])if(data[key]){if(!Number.isFinite(Date.parse(data[key])))throw new InputError('Data inválida.');target[key]=new Date(data[key]).toISOString();}if(target.start_time&&(target.end_time||target.stop_time)&&target.start_time>=(target.end_time||target.stop_time))throw new InputError('O término deve ser posterior ao início.');}
function targeting(data) {
  if(!data||typeof data!=='object'||Array.isArray(data))throw new InputError('Revise a segmentação.');
  const allowed=['geo_locations','age_min','age_max','genders','publisher_platforms','facebook_positions','instagram_positions','device_platforms','flexible_spec','custom_audiences','excluded_custom_audiences'];
  if(Object.keys(data).some(k=>!allowed.includes(k))||JSON.stringify(data).length>10000)throw new InputError('Segmentação não suportada.');
  if(!data.geo_locations||!['countries','regions','cities'].some(k=>Array.isArray(data.geo_locations[k])&&data.geo_locations[k].length))throw new InputError('Selecione uma localização.');
  if(data.age_min!=null&&(!Number.isInteger(data.age_min)||data.age_min<18||data.age_min>65)||data.age_max!=null&&(!Number.isInteger(data.age_max)||data.age_max<18||data.age_max>65)||data.age_min>data.age_max)throw new InputError('Faixa etária inválida.');
  return data;
}
export function validateDraft(data) {
  const name=string(data.name),landing_page=safeUrl(data.landing_page);
  const objective=string(data.objective);
  if(!['OUTCOME_TRAFFIC','OUTCOME_LEADS','OUTCOME_SALES','OUTCOME_ENGAGEMENT','OUTCOME_AWARENESS'].includes(objective))throw new InputError('Revise o objetivo da campanha.');
  const campaign={name,objective,status:'PAUSED',special_ad_categories:[],is_adset_budget_sharing_enabled:false};
  if(!Array.isArray(data.special_ad_categories)||data.special_ad_categories.some(v=>!['CREDIT','EMPLOYMENT','HOUSING','ISSUES_ELECTIONS_POLITICS'].includes(v)))throw new InputError('Revise as categorias especiais.');
  campaign.special_ad_categories=data.special_ad_categories;
  const adset={name:name+' — Público',daily_budget:amount(data.daily_budget),billing_event:'IMPRESSIONS',optimization_goal:string(data.optimization_goal),targeting:targeting(data.targeting),status:'PAUSED'};
  if(!['LINK_CLICKS','LANDING_PAGE_VIEWS','OFFSITE_CONVERSIONS','REACH','IMPRESSIONS','CONVERSATIONS','LEAD_GENERATION'].includes(adset.optimization_goal))throw new InputError('Otimização inválida.');
  dates(data,adset);
  if(data.pixel_id)adset.promoted_object={pixel_id:id(data.pixel_id),custom_event_type:string(data.event)};
  if(data.optimization_goal==='OFFSITE_CONVERSIONS'&&!data.pixel_id)throw new InputError('Selecione o pixel e o evento de conversão.');
  if(data.bid_amount){adset.bid_amount=amount(data.bid_amount);adset.bid_strategy='LOWEST_COST_WITH_BID_CAP';}else adset.bid_strategy='LOWEST_COST_WITHOUT_CAP';
  const cta=string(data.cta);if(!['LEARN_MORE','SIGN_UP','CONTACT_US','SHOP_NOW','GET_QUOTE','WHATSAPP_MESSAGE'].includes(cta))throw new InputError('CTA inválido.');
  if(data.optimization_goal==='CONVERSATIONS') {
    if(objective!=='OUTCOME_ENGAGEMENT'||cta!=='WHATSAPP_MESSAGE'||!['wa.me','api.whatsapp.com'].includes(new URL(landing_page).hostname))throw new InputError('Para WhatsApp, revise objetivo de engajamento, CTA WhatsApp e link oficial de destino.');
    adset.destination_type='WHATSAPP';adset.promoted_object={page_id:id(data.page_id)};
  }
  if(data.optimization_goal==='LEAD_GENERATION') {
    if(objective!=='OUTCOME_LEADS')throw new InputError('Formulários instantâneos exigem objetivo de leads.');
    id(data.lead_form_id);adset.destination_type='ON_AD';adset.promoted_object={page_id:id(data.page_id)};
  }
  const link_data={link:landing_page,message:string(data.text,5000),name:string(data.title,200),description:typeof data.description==='string'?data.description.slice(0,500):'',call_to_action:{type:cta,value:{link:landing_page}}};
  if(data.optimization_goal==='LEAD_GENERATION')link_data.call_to_action.value={lead_gen_form_id:id(data.lead_form_id)};
  if(!/^[a-f0-9]{32,128}$/i.test(data.image_hash||''))throw new InputError('Envie e selecione uma imagem da conta.');
  link_data.image_hash=data.image_hash;
  const slug=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const url_tags=data.url_tags||`utm_source=meta&utm_medium=paid_social&utm_campaign=${slug(name)}&utm_content=${slug(data.title)}`;
  if(typeof url_tags!=='string'||url_tags.length>1000||/[<>\r\n]/.test(url_tags))throw new InputError('UTMs inválidas.');
  return {name,campaign,adset,creative:{name:name+' — Criativo',object_story_spec:{page_id:id(data.page_id),link_data},url_tags},ad:{name:name+' — Anúncio',status:'PAUSED'}};
}
export async function adsContext(repository,env,fetcher) {
  const {row,client}=await metaAccess(repository.meta,env,fetcher);
  let selected;try{selected=JSON.parse(row.account_json);}catch{}
  if(!/^act_\d+$/.test(selected?.id||''))throw new MetaError('ACCOUNT_REQUIRED',409);
  const account=await client.get(selected.id,{fields:'id,name,currency,timezone_name,account_status'});
  if(account.id!==selected.id)throw new MetaError('ACCOUNT_INVALID',403);
  const grants=await client.list('me/permissions');
  const granted=grants.rows.filter(p=>p.status==='granted').map(p=>p.permission);
  return {account,client,revision:row.revision,read:granted.includes('ads_read')||granted.includes('ads_management'),manage:granted.includes('ads_management'),expiresAt:new Date(row.expires_at).toISOString()};
}
export function period(params) {
  const value=params.get('period')||'30';
  if(['today','yesterday','7','14','30'].includes(value))return {date_preset:({today:'today',yesterday:'yesterday','7':'last_7d','14':'last_14d','30':'last_30d'})[value]};
  const since=params.get('since'),until=params.get('until');
  if(value!=='custom'||!/^\d{4}-\d{2}-\d{2}$/.test(since||'')||!/^\d{4}-\d{2}-\d{2}$/.test(until||'')||!Number.isFinite(Date.parse(since))||!Number.isFinite(Date.parse(until))||since>until||Date.parse(until)-Date.parse(since)>366*86400000)throw new InputError('Período inválido (máximo de 366 dias).');
  return {time_range:JSON.stringify({since,until})};
}
export function metrics(raw={}) {
  const result={raw:Object.fromEntries(insightFields.split(',').filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]))};for(const key of ['spend','impressions','reach','clicks','ctr','cpc','cpm','frequency'])result[key]=raw[key]!=null&&Number.isFinite(Number(raw[key]))?Number(raw[key]):null;
  for(const key of ['actions','action_values','conversions','cost_per_action_type'])result[key]=Array.isArray(raw[key])?raw[key].map(x=>({action_type:String(x.action_type),value:Number.isFinite(Number(x.value))?Number(x.value):null})):null;
  return result;
}
export async function owned(ctx,kind,resource) {
  if(!Object.hasOwn(fields,kind))throw new InputError('Recurso inválido.');
  const row=await ctx.client.get(id(resource),{fields:fields[kind]});
  if(String(row.account_id)!==ctx.account.id.slice(4))throw new InputError('O recurso não pertence à conta selecionada.',403);
  return row;
}
export async function report(ctx,params) {
  const range=period(params),result={account:ctx.account,read:ctx.read,manage:ctx.manage,expiresAt:ctx.expiresAt};
  for(const kind of Object.keys(fields)){
    const [objects,insights]=await Promise.all([ctx.client.list(ctx.account.id+'/'+kind,{fields:fields[kind]}),ctx.client.list(ctx.account.id+'/insights',{level:({campaigns:'campaign',adsets:'adset',ads:'ad'})[kind],fields:insightFields,...range})]);
    const key=({campaigns:'campaign_id',adsets:'adset_id',ads:'ad_id'})[kind],byId=new Map(insights.rows.map(r=>[r[key],r]));
    result[kind]=objects.rows.map(row=>({...row,metrics:metrics(byId.get(row.id))}));result.truncated ||=objects.truncated||insights.truncated;
  }
  result.spend={};for(const [label,preset] of [['today','today'],['7','last_7d'],['30','last_30d']]){const r=await ctx.client.get(ctx.account.id+'/insights',{fields:'spend',date_preset:preset});result.spend[label]=metrics(r.data?.[0]).spend;}
  const totals=await ctx.client.get(ctx.account.id+'/insights',{fields:insightFields,...range});result.totals=metrics(totals.data?.[0]);
  result.timeline=(await ctx.client.list(ctx.account.id+'/insights',{fields:'date_start,spend,impressions,clicks',time_increment:1,...range})).rows.map(r=>({date:r.date_start,...metrics(r)}));
  return result;
}
export async function proposal(ctx,data) {
  const {action,kind,resource}=data;
  if(action==='create') {
    const after=validateDraft(data.draft);
    if(data.draft.existing_campaign_id){await owned(ctx,'campaigns',data.draft.existing_campaign_id);after.existing_campaign_id=id(data.draft.existing_campaign_id);}
    if(data.draft.existing_adset_id){const set=await owned(ctx,'adsets',data.draft.existing_adset_id);if(after.existing_campaign_id&&String(set.campaign_id)!==after.existing_campaign_id)throw new InputError('O conjunto não pertence à campanha escolhida.');after.existing_adset_id=id(data.draft.existing_adset_id);}
    after.creative_only=data.draft.creative_only===true;
    return {action,before:null,after};
  }
  const before=await owned(ctx,kind,resource),after={};
  if(action==='duplicate')return {action,before,after:{kind,resource,status_option:'PAUSED',deep_copy:kind==='campaigns'}};
  if(action==='status') {if(!['ACTIVE','PAUSED'].includes(data.status))throw new InputError('Status inválido.');after.status=data.status;}
  else if(action==='edit') {
    if(data.name)after.name=string(data.name);
    if(kind!=='ads') {if(data.daily_budget!=null)after.daily_budget=amount(data.daily_budget);dates(data,after);}
    if(kind==='adsets'&&data.targeting)after.targeting=targeting(data.targeting);
    if(kind==='adsets'&&data.bid_amount)after.bid_amount=amount(data.bid_amount);
    if(kind==='ads'&&data.creative_id){const creative=await ctx.client.get(id(data.creative_id),{fields:'id,account_id'});if(String(creative.account_id)!==ctx.account.id.slice(4))throw new InputError('Criativo de outra conta.',403);after.creative={creative_id:creative.id};}
    if(!Object.keys(after).length)throw new InputError('Nenhuma alteração informada.');
  } else throw new InputError('Ação inválida.');
  return {action,before,after:{kind,resource,values:after}};
}
export async function execute(ctx,entry,onProgress=async()=>{}) {
  const data=entry.after;
  if(entry.action==='create') {
    const result={};
    if(!data.creative_only){
      if(data.existing_adset_id){await owned(ctx,'adsets',data.existing_adset_id);result.adset={id:data.existing_adset_id};}
      else {
        if(data.existing_campaign_id){await owned(ctx,'campaigns',data.existing_campaign_id);result.campaign={id:data.existing_campaign_id};}
        else {result.campaign=await ctx.client.post(ctx.account.id+'/campaigns',data.campaign);id(result.campaign.id);await onProgress(result);}
        result.adset=await ctx.client.post(ctx.account.id+'/adsets',{...data.adset,campaign_id:result.campaign.id});id(result.adset.id);await onProgress(result);
      }
    }
    result.creative=await ctx.client.post(ctx.account.id+'/adcreatives',data.creative);id(result.creative.id);await onProgress(result);
    if(data.creative_only)return result;
    result.ad=await ctx.client.post(ctx.account.id+'/ads',{...data.ad,adset_id:result.adset.id,creative:{creative_id:result.creative.id}});id(result.ad.id);return result;
  }
  const current=await owned(ctx,data.kind,data.resource);
  if(JSON.stringify(current)!==JSON.stringify(entry.before))throw new InputError('O recurso mudou desde a revisão. Sincronize e confirme novamente.',409);
  if(entry.action==='duplicate')return ctx.client.post(data.resource+'/copies',{status_option:'PAUSED',...(data.deep_copy?{deep_copy:true}:{})});
  return ctx.client.post(data.resource,data.values);
}
