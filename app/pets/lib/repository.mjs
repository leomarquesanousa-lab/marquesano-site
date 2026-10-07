import { sql, one, transaction } from './db.mjs';
import { slugify, states, situations } from './constants.mjs';
import { PortalError, isPetAdmin, ownsPet } from './auth.mjs';
import { randomUUID } from 'node:crypto';

const activeOwner="(EXISTS (SELECT 1 FROM users u WHERE u.id=l.user_id AND u.active=1) OR EXISTS (SELECT 1 FROM pet_public_users u WHERE u.id=l.public_user_id AND u.active=1))";
const publicColumns=`l.*, (SELECT name FROM pet_categories WHERE slug=l.category) AS category_name, (SELECT id FROM pet_photos WHERE listing_id=l.id ORDER BY position LIMIT 1) AS photo_id`;
export async function getCategories() {return sql('SELECT * FROM pet_categories WHERE active=1 ORDER BY name');}
export async function listPets(filters={},limit=24,offset=0) {
 const conditions=["l.moderation='aprovado'", activeOwner]; const args=[];
 const add=(text,value)=>{args.push(value);conditions.push(text.replace('?',`$${args.length}`));};
 if(filters.resolved) conditions.push("l.status='reencontrado'");else conditions.push("l.status='ativo'");
 for(const key of ['situation','category','state','sex','size','city_slug']) if(filters[key])add(`l.${key}=?`,String(filters[key]));
 for(const key of ['city','neighborhood'])if(filters[key])add(`LOWER(l.${key}) LIKE ?`,'%'+String(filters[key]).toLowerCase()+'%');
 if(filters.q)add("LOWER(l.title || ' ' || l.name || ' ' || l.description) LIKE ?",'%'+String(filters.q).toLowerCase()+'%');
 if(/^\d{4}-\d{2}-\d{2}$/.test(filters.date||''))add('l.event_date>=?',filters.date);
 const where=conditions.join(' AND ');
 const total=Number((await one(`SELECT COUNT(*) AS total FROM pet_listings l WHERE ${where}`,args)).total);
 const items=await sql(`SELECT ${publicColumns} FROM pet_listings l WHERE ${where} ORDER BY l.created_at DESC,l.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,limit,offset]);
 return {items,total};
}
export async function getPet(slug,user=null) {
 const pet=await one(`SELECT ${publicColumns} FROM pet_listings l WHERE l.slug=$1`,[slug]);
 if(!pet)return null;
 const owner=await one(pet.public_user_id?'SELECT active FROM pet_public_users WHERE id=$1':'SELECT active FROM users WHERE id=$1',[pet.public_user_id||pet.user_id]);
 if((pet.moderation!=='aprovado'||!owner?.active)&&!ownsPet(user,pet)&&!isPetAdmin(user))return null;
 pet.photos=await sql('SELECT id,position FROM pet_photos WHERE listing_id=$1 ORDER BY position',[pet.id]);return pet;
}
export async function cities(limit=10000) {return sql(`SELECT city,city_slug,state,COUNT(*) AS total FROM pet_listings l WHERE moderation='aprovado' AND status='ativo' AND ${activeOwner} GROUP BY city,city_slug,state ORDER BY total DESC,city LIMIT $1`,[Math.min(10000,Math.max(1,limit))]);}
export async function myPets(user) {if(!user?.id||!['public','admin'].includes(user.kind))throw new PortalError('Autenticação necessária.',401);return sql(`SELECT ${publicColumns} FROM pet_listings l WHERE ${user.kind==='public'?'public_user_id':'user_id'}=$1 ORDER BY created_at DESC`,[user.id]);}
const fields=['situation','category','name','title','description','city','state','neighborhood','location_hint','event_date','sex','size','color','breed','age','features','contact_name','contact_phone','whatsapp'];
export function validateListing(input) {
 const result={};
 for(const key of fields){const value=input[key];if(value!==undefined&&typeof value!=='string')throw new PortalError('Há um campo inválido no formulário.');result[key]=(value||'').trim();if(result[key].length>(['description','features'].includes(key)?3000:160))throw new PortalError('Um dos textos ultrapassou o limite permitido.');}
 for(const key of ['situation','category','title','description','city','state','neighborhood','event_date','sex','size','color','contact_name'])if(!result[key])throw new PortalError('Preencha todos os campos obrigatórios.');
 if(!Object.hasOwn(situations,result.situation)||!states.includes(result.state)||!['macho','femea','desconhecido'].includes(result.sex)||!['pequeno','medio','grande','desconhecido'].includes(result.size))throw new PortalError('Selecione valores válidos para o anúncio.');
 if(result.title.length<5||result.description.length<20)throw new PortalError('Use um título de pelo menos 5 caracteres e uma descrição de pelo menos 20.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(result.event_date)||Number.isNaN(Date.parse(result.event_date))||new Date(result.event_date).toISOString().slice(0,10)!==result.event_date||result.event_date>new Date().toISOString().slice(0,10))throw new PortalError('Informe uma data válida, até hoje.');
 // Localização estruturada aceita apenas bairro e ponto de referência, sem endereço numerado.
 const location=[result.location_hint,result.neighborhood,result.description,result.features,result.title,result.city].join(' ');
 if(/(?:rua|avenida|av\.?|travessa|alameda|estrada)\s+[^\n]{0,70}\b\d{1,6}\b|\b(?:n[º°o.]|numero|número|apartamento|apto|casa)\s*[:#-]?\s*\d+|\b\d{5}-\d{3}\b/i.test(location))throw new PortalError('Remova números de endereço, apartamento e CEP. Publique apenas bairro e referências aproximadas.');
 for(const key of ['contact_phone','whatsapp']) {result[key]=result[key].replace(/\D/g,'');if(result[key]&&!/^(?:55)?\d{10,11}$/.test(result[key]))throw new PortalError('Informe um telefone brasileiro com DDD.');}
 if(!result.contact_phone&&!result.whatsapp)throw new PortalError('Informe um telefone ou WhatsApp para contato.');
 return result;
}
export async function savePet(input,user,id=null,photos=[],keepPhotos=[]) {
 if(photos.some(photo=>!photo.storage_key||photo.data))throw new PortalError('Novas fotos precisam usar o storage R2.');
 const data=validateListing(input);const category=await one('SELECT slug FROM pet_categories WHERE slug=$1 AND active=1',[data.category]);if(!category)throw new PortalError('Categoria indisponível.');
 if(!Array.isArray(photos)||photos.length>6||!Array.isArray(keepPhotos))throw new PortalError('Envie até 6 fotos.');
 return transaction(async()=>{
  const now=new Date().toISOString();let existing=null;
  if(id){existing=await one('SELECT * FROM pet_listings WHERE id=$1',[id]);if(!existing||!ownsPet(user,existing)&&!isPetAdmin(user))throw new PortalError('Anúncio não encontrado.',404);}
  const photoRows=id?await sql('SELECT id FROM pet_photos WHERE listing_id=$1 ORDER BY position',[id]):[];
  if(keepPhotos.some(p=>!photoRows.some(row=>row.id===p))||new Set(keepPhotos).size!==keepPhotos.length)throw new PortalError('Seleção de fotos inválida.');
  if(keepPhotos.length+photos.length>6||keepPhotos.length+photos.length<1)throw new PortalError('O anúncio precisa ter entre 1 e 6 fotos.');
  const petId=id||randomUUID();const slug=existing?.slug||slugify(data.title)+'-'+petId.slice(0,8);
  if(id)await sql(`UPDATE pet_listings SET ${fields.map((f,i)=>f+'=$'+(i+1)).join(',')},city_slug=$${fields.length+1},moderation=CASE WHEN moderation='oculto' THEN 'oculto' ELSE 'aprovado' END,updated_at=$${fields.length+2} WHERE id=$${fields.length+3}`,[...fields.map(f=>data[f]),slugify(data.city),now,petId]);
  else {const columns=['id','slug','user_id','public_user_id','moderation',...fields,'city_slug','created_at','updated_at'];await sql(`INSERT INTO pet_listings(${columns.join(',')}) VALUES(${columns.map((_,i)=>'$'+(i+1)).join(',')})`,[petId,slug,user.kind==='public'?null:user.id,user.kind==='public'?user.id:null,'aprovado',...fields.map(f=>data[f]),slugify(data.city),now,now]);}
  // Recreate positions in one transaction so edits cannot leave a partial gallery.
  const retained=[];for(const photoId of keepPhotos)retained.push(await one('SELECT * FROM pet_photos WHERE id=$1',[photoId]));
  await sql('DELETE FROM pet_photos WHERE listing_id=$1',[petId]);
  let position=0;for(const photo of [...retained,...photos])await sql('INSERT INTO pet_photos(id,listing_id,position,mime,data,storage_key) VALUES($1,$2,$3,$4,$5,$6)',[photo.id||randomUUID(),petId,position++,photo.mime,photo.storage_key?null:photo.data,photo.storage_key||null]);
  return {id:petId,slug};
 });
}
export function validatePhoto(buffer) {
 if(buffer.length>4*1024*1024||buffer.length<12)throw new PortalError('Cada foto deve ter até 4 MB e ser JPEG, PNG ou WebP.');
 let mime;if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)mime='image/jpeg';else if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')mime='image/webp';
 if(!mime)throw new PortalError('Formato de foto inválido. Use JPEG, PNG ou WebP.');return {mime};
}
