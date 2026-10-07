import { adminDatabase } from '../../server/admin/core.mjs';
export async function db(){
 const adapter=await adminDatabase();
 return {query:async(text,args=[]) => (await adapter.query(text,args)).rows,transaction:fn=>adapter.transaction(fn),close:()=>adapter.close()};
}
export async function sql(text,args=[]){return (await db()).query(text,args);}
export async function one(text,args=[]){return (await sql(text,args))[0]||null;}
export async function transaction(fn){return (await db()).transaction(fn);}
