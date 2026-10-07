import {createHash,createHmac,randomUUID} from 'node:crypto';
// S3 Signature V4, region auto. Uses only the bucket explicitly configured by Marquesano.
export const petPrefixes=Object.freeze({ads:'pets/ads/',users:'pets/users/'});
const failure=(message,status=503)=>Object.assign(new Error(message),{status});
export function storageConfig(env=process.env){
 const {R2_ACCOUNT_ID:account,R2_BUCKET_NAME:bucket,R2_ACCESS_KEY_ID:access,R2_SECRET_ACCESS_KEY:secret}=env;
 if(!account||!bucket||!access||!secret)throw failure('Upload de fotos indisponível: configure o storage R2 da Marquesano.');
 if(!/^[a-f0-9]{32}$/i.test(account)||!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))throw failure('Configuração do storage R2 inválida.');
 return {endpoint:'https://'+account+'.r2.cloudflarestorage.com',bucket,access,secret};
}
// Temporary development-only diagnostic; never logs credentials.
let lastConfigStatus;
export function storageReady(env=process.env){
 let ready=false;try{storageConfig(env);ready=true;}catch{}
 if(process.env.NODE_ENV==='development'){
  const status={accountId:Boolean(env.R2_ACCOUNT_ID),bucketName:Boolean(env.R2_BUCKET_NAME),accessKeyId:Boolean(env.R2_ACCESS_KEY_ID),secretAccessKey:Boolean(env.R2_SECRET_ACCESS_KEY),storageReady:ready};
  const signature=JSON.stringify(status);
  if(signature!==lastConfigStatus){console.info('R2_CONFIG_STATUS',status);lastConfigStatus=signature;}
 }
 return ready;
}
const hash=value=>createHash('sha256').update(value).digest('hex');
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export function signedObjectRequest(method,key,body=Buffer.alloc(0),mime='',{env=process.env,now=new Date()}={}){
 if(!/^pets\/(ads|users)\/[a-zA-Z0-9/_-]+\.(jpg|png|webp)$/.test(key)||key.includes('..'))throw failure('Chave de foto inválida.',400);
 const config=storageConfig(env),url=new URL(config.endpoint+'/'+encode(config.bucket)+'/'+key.split('/').map(encode).join('/'));
 const stamp=now.toISOString().replace(/[:-]|\.\d{3}/g,''),day=stamp.slice(0,8),scope=day+'/auto/s3/aws4_request';
 const headers={host:url.host,'x-amz-content-sha256':hash(body),'x-amz-date':stamp};if(mime)headers['content-type']=mime;
 const names=Object.keys(headers).sort(),signed=names.join(';'),canonical=names.map(k=>k+':'+headers[k]+'\n').join('');
 const request=[method,url.pathname,'',canonical,signed,hash(body)].join('\n');
 const stringToSign=['AWS4-HMAC-SHA256',stamp,scope,hash(request)].join('\n');
 const signing=hmac(hmac(hmac(hmac('AWS4'+config.secret,day),'auto'),'s3'),'aws4_request');
 headers.authorization='AWS4-HMAC-SHA256 Credential='+config.access+'/'+scope+', SignedHeaders='+signed+', Signature='+createHmac('sha256',signing).update(stringToSign).digest('hex');
 return {url,options:{method,headers,body:method==='PUT'?body:undefined,redirect:'error',signal:AbortSignal.timeout(15000)}};
}
async function objectRequest(method,key,body,mime,options={}){
 const signed=signedObjectRequest(method,key,body,mime,options);
 let response;try{response=await (options.fetcher||fetch)(signed.url,signed.options);}catch{throw failure('Storage R2 temporariamente indisponível.');}
 if(!response.ok)throw failure(method==='GET'&&response.status===404?'Foto não encontrada.':'Não foi possível acessar o storage R2.',method==='GET'&&response.status===404?404:503);
 return response;
}
export async function uploadPetPhoto(photo,kind='ads',options={}){
 if(!Object.hasOwn(petPrefixes,kind))throw failure('Prefixo inválido.',400);
 const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[photo.mime];
 if(!extension||!Buffer.isBuffer(photo.buffer))throw failure('Foto inválida.',400);
 const key=petPrefixes[kind]+randomUUID()+'.'+extension;
 await objectRequest('PUT',key,photo.buffer,photo.mime,options);return {mime:photo.mime,storage_key:key};
}
export async function readPetPhoto(key,options={}){return objectRequest('GET',key,undefined,undefined,options);}
export async function deletePetPhoto(key,options={}){return objectRequest('DELETE',key,undefined,undefined,options);}
