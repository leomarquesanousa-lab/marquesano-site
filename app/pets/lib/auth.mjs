import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { currentAdmin } from '../../server/admin/session.js';
import { validAdminRequestOrigin } from '../../server/admin/origin.mjs';
import { canAccess } from '../../server/admin/core.mjs';
import { one, sql } from './db.mjs';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const isPetAdmin=user=>Boolean(user?.kind==='admin'&&canAccess(user.role,'pets'));
export const ownsPet=(user,pet)=>Boolean(user&&(user.kind==='public'?pet.public_user_id===user.id:pet.user_id===user.id&&user.kind==='admin'));
export const publicCookieName=()=>process.env.NODE_ENV==='production'?'__Host-marquesano_pets':'marquesano_pets';
const publicCookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:604800});
export async function currentPublicUser(){
 const token=(await cookies()).get(publicCookieName())?.value;
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
 const user=await one('SELECT u.id,u.name,u.email FROM pet_public_users u JOIN pet_public_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires>$2 AND u.active=1',[digest(token),Date.now()]);
 return user?{...user,kind:'public'}:null;
}
export async function currentUser(){const user=await currentAdmin();return user?{...user,kind:'admin',name:user.name||user.email}:currentPublicUser();}
export async function createPublicSession(id){
 const token=randomBytes(32).toString('hex');
 await sql('DELETE FROM pet_public_sessions WHERE expires<=$1',[Date.now()]);
 const previous=(await cookies()).get(publicCookieName())?.value;
 if(previous)await sql('DELETE FROM pet_public_sessions WHERE token_hash=$1',[digest(previous)]);
 await sql('INSERT INTO pet_public_sessions(token_hash,user_id,expires) VALUES($1,$2,$3)',[digest(token),id,Date.now()+604800000]);
 (await cookies()).set(publicCookieName(),token,publicCookieOptions());
}
export async function logoutPublic(){const jar=await cookies(),token=jar.get(publicCookieName())?.value;if(token)await sql('DELETE FROM pet_public_sessions WHERE token_hash=$1',[digest(token)]);jar.set(publicCookieName(),'',{...publicCookieOptions(),maxAge:0});}
export class PortalError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function requireUser(admin=false) {const user=await currentUser();if(!user)throw new PortalError('Entre na sua conta para continuar.',401);if(admin&&!isPetAdmin(user))throw new PortalError('Acesso restrito à administração.',403);return user;}
export function checkOrigin(request) {if(!validAdminRequestOrigin(request))throw new PortalError('Origem inválida.',403);}
export async function rateLimit(key,limit=10,minutes=15) {
 const now=new Date().toISOString(),reset=new Date(Date.now()+minutes*60000).toISOString();
 await sql('DELETE FROM pet_rate_limits WHERE reset_at<$1',[now]);
 const row=await one(`INSERT INTO pet_rate_limits(key,attempts,reset_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN pet_rate_limits.reset_at<$3 THEN 1 ELSE pet_rate_limits.attempts+1 END,reset_at=CASE WHEN pet_rate_limits.reset_at<$3 THEN $2 ELSE pet_rate_limits.reset_at END RETURNING attempts`,[digest(key),reset,now]);
 if(row.attempts>limit)throw new PortalError('Muitas tentativas. Aguarde alguns minutos e tente novamente.',429);
}
export function apiError(error) {if(!error.status)console.error('PET_PORTAL_REQUEST_FAILED',error.name);return Response.json({error:error.status?error.message:'Não foi possível concluir. Tente novamente em instantes.'},{status:error.status||500});}
