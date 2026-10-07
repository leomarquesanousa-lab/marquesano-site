import { randomUUID } from 'node:crypto';
import { currentUser, requireUser, checkOrigin, rateLimit, isPetAdmin, ownsPet, createPublicSession, logoutPublic, apiError, PortalError } from '../../../pets/lib/auth.mjs';
import { one, sql } from '../../../pets/lib/db.mjs';
import { savePet } from '../../../pets/lib/repository.mjs';
import { sanitizePhoto } from '../../../pets/lib/photos.mjs';
import {uploadPetPhoto,readPetPhoto,deletePetPhoto,storageConfig} from '../../../pets/lib/storage.mjs';
import {hashPassword,verifyPassword} from '../../../server/admin/core.mjs';
import { slugify } from '../../../pets/lib/constants.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
async function boundedRequest(request,max=30*1024*1024) {
 if(Number(request.headers.get('content-length'))>max)throw new PortalError('Arquivos maiores que o limite permitido.',413);
 const reader=request.body?.getReader();if(!reader)throw new PortalError('Solicitação vazia.');const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new PortalError('Arquivos maiores que o limite permitido.',413);}chunks.push(value);}
 return new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:Buffer.concat(chunks)});
}
async function json(request){try{return await (await boundedRequest(request,16000)).json();}catch(error){if(error.status)throw error;throw new PortalError('Solicitação inválida.');}}
export async function GET(request,{params}) {
 try {
  const path=(await params).path;
  if(path[0]==='photos'&&path.length===2){
   const photo=await one(`SELECT p.*,l.moderation,l.user_id,l.public_user_id,COALESCE(u.active,a.active) AS active FROM pet_photos p JOIN pet_listings l ON l.id=p.listing_id LEFT JOIN pet_public_users u ON u.id=l.public_user_id LEFT JOIN users a ON a.id=l.user_id WHERE p.id=$1`,[path[1]]);
   if(!photo)throw new PortalError('Foto não encontrada.',404);
   if(photo.moderation!=='aprovado'||!photo.active){const user=await currentUser();if(!ownsPet(user,photo)&&!isPetAdmin(user))throw new PortalError('Foto não encontrada.',404);}
   if(photo.storage_key){const object=await readPetPhoto(photo.storage_key);return new Response(object.body,{headers:{'Content-Type':photo.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
   return new Response(Buffer.from(photo.data,'base64'),{headers:{'Content-Type':photo.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  throw new PortalError('Rota não encontrada.',404);
 }catch(error){return apiError(error);}
}
export async function POST(request,{params}) {
 try {
  checkOrigin(request);const path=(await params).path;
  if(path.length===1&&['register','login','logout'].includes(path[0])){
   if(path[0]==='logout'){await logoutPublic();return Response.json({ok:true});}
   const data=await json(request),email=typeof data.email==='string'?data.email.trim().toLowerCase():'',password=data.password;
   if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<12||Buffer.byteLength(password)>256)throw new PortalError('Informe e-mail válido e senha de 12 a 256 caracteres.');
   await rateLimit('public-auth:global',100,15);await rateLimit('public-auth:'+email,5,15);
   if(path[0]==='register'){
    const name=typeof data.name==='string'?data.name.trim():'';
    if(name.length<2||name.length>100||data.privacy!==true)throw new PortalError('Informe seu nome e aceite os termos e a política de privacidade.');
    const id=randomUUID(),hash=await hashPassword(password);
    try{await sql('INSERT INTO pet_public_users(id,name,email,password_hash,created_at) VALUES($1,$2,$3,$4,$5)',[id,name,email,hash,new Date().toISOString()]);}catch(error){if(error.code==='23505')throw new PortalError('Não foi possível cadastrar esta conta. Tente entrar.',409);throw error;}
    await createPublicSession(id);return Response.json({ok:true},{status:201});
   }
   const publicUser=await one('SELECT id,password_hash,active FROM pet_public_users WHERE email=$1',[email]);
   const valid=await verifyPassword(password,publicUser?.password_hash||['scrypt','0'.repeat(32),'0'.repeat(128)].join('$'));
   if(!valid||!publicUser?.active)throw new PortalError('E-mail ou senha inválidos.',401);
   await createPublicSession(publicUser.id);return Response.json({ok:true});
  }
  const user=await requireUser();
  if(path[0]==='listings'&&(path.length===1||path.length===2)){
   await rateLimit('listing:'+user.id,30,60);
   const form=await (await boundedRequest(request)).formData();
   const input=Object.fromEntries([...form.entries()].filter(([key])=>!['photos','keepPhotos'].includes(key)));
   const files=form.getAll('photos').filter(file=>typeof file!=='string'&&file.size);
   if(files.length>6)throw new PortalError('Envie até 6 fotos.');
   if(files.length)storageConfig();
   if(path[1]){const existing=await one('SELECT user_id,public_user_id FROM pet_listings WHERE id=$1',[path[1]]);if(!existing||(!ownsPet(user,existing)&&!isPetAdmin(user)))throw new PortalError('Anúncio não encontrado.',404);}
   const sanitized=[];for(const file of files)sanitized.push(sanitizePhoto(Buffer.from(await file.arrayBuffer())));
   const photos=[];let pet;
   try{for(const photo of sanitized)photos.push(await uploadPetPhoto(photo));pet=await savePet(input,user,path[1]||null,photos,form.getAll('keepPhotos'));}
   catch(error){await Promise.allSettled(photos.map(photo=>deletePetPhoto(photo.storage_key)));throw error;}
   return Response.json(pet,{status:path.length===1?201:200});
  }
  if(path[0]==='listings'&&path.length===3){
   const pet=await one('SELECT * FROM pet_listings WHERE id=$1',[path[1]]);if(!pet)throw new PortalError('Anúncio não encontrado.',404);
   const action=path[2];const data=await json(request);
   if(action==='report'){
    if(pet.moderation!=='aprovado')throw new PortalError('Anúncio indisponível.',404);await rateLimit('report:'+user.id,5,60);
    const reason=String(data.reason||'').trim();if(reason.length<10||reason.length>1000)throw new PortalError('Descreva o problema (10 a 1.000 caracteres).');
    if(await one("SELECT id FROM pet_reports WHERE listing_id=$1 AND COALESCE(public_user_id,user_id)=$2 AND status='aberta'",[pet.id,user.id]))throw new PortalError('Sua denúncia já está em análise.');
    await sql('INSERT INTO pet_reports(id,listing_id,user_id,public_user_id,reason,created_at) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),pet.id,user.kind==='public'?null:user.id,user.kind==='public'?user.id:null,reason,new Date().toISOString()]);return Response.json({ok:true});
   }
   if(!ownsPet(user,pet)&&!isPetAdmin(user))throw new PortalError('Sem permissão para alterar este anúncio.',403);
   if(action==='status'){
    const allowed=pet.situation==='adocao'?['adotado','resolvido']:['reencontrado','resolvido'];
    if(!allowed.includes(data.status))throw new PortalError('Situação final inválida.');
    await sql('UPDATE pet_listings SET status=$1,updated_at=$2 WHERE id=$3',[data.status,new Date().toISOString(),pet.id]);return Response.json({ok:true});
   }
   if(action==='delete'){await sql('DELETE FROM pet_listings WHERE id=$1',[pet.id]);return Response.json({ok:true});}
  }
  if(path[0]==='admin'&&path.length===2){
   await requireUser(true);const data=await json(request);await rateLimit('admin:'+user.id,200,60);
   if(path[1]==='moderation'){
    if(!['aprovado','oculto'].includes(data.moderation))throw new PortalError('Ação inválida.');
    if(!await one('SELECT id FROM pet_listings WHERE id=$1',[data.id]))throw new PortalError('Anúncio não encontrado.',404);
    await sql('UPDATE pet_listings SET moderation=$1,updated_at=$2 WHERE id=$3',[data.moderation,new Date().toISOString(),data.id]);
   }else if(path[1]==='status'||path[1]==='delete'){
    if(!await one('SELECT id FROM pet_listings WHERE id=$1',[data.id]))throw new PortalError('Anúncio não encontrado.',404);
    if(path[1]==='delete')await sql('DELETE FROM pet_listings WHERE id=$1',[data.id]);
    else {if(data.status!=='resolvido')throw new PortalError('Situação inválida.');await sql('UPDATE pet_listings SET status=$1,updated_at=$2 WHERE id=$3',['resolvido',new Date().toISOString(),data.id]);}
   }else if(path[1]==='reports'){
    if(!await one('SELECT id FROM pet_reports WHERE id=$1',[data.id]))throw new PortalError('Denúncia não encontrada.',404);
    await sql("UPDATE pet_reports SET status='revisada' WHERE id=$1",[data.id]);
   }else if(path[1]==='categories'){
    const slug=slugify(data.slug||'');const name=String(data.name||'').trim();if(!slug||slug.length>60||name.length<2||name.length>60||typeof data.active!=='boolean')throw new PortalError('Informe nome e identificador válidos.');
    await sql('INSERT INTO pet_categories(slug,name,active) VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET name=$2,active=$3',[slug,name,data.active?1:0]);
   }else throw new PortalError('Rota não encontrada.',404);
   return Response.json({ok:true});
  }
  throw new PortalError('Rota não encontrada.',404);
 }catch(error){return apiError(error);}
}
