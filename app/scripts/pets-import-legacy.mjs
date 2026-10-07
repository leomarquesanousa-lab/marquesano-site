// One-time, non-destructive import. SQLite is never used by the Pets runtime.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { loadLocalCheckoutEnv } from './local-env.mjs';
import { db, sql, one, transaction } from '../pets/lib/db.mjs';

loadLocalCheckoutEnv();
const source=new DatabaseSync(process.argv[2]||fileURLToPath(new URL('../pets/data/portal.sqlite',import.meta.url)),{readOnly:true});
let database;
try {
 database=await db();
 const listings=source.prepare('SELECT * FROM pet_listings').all();
 const reports=source.prepare('SELECT * FROM pet_reports').all();
 const owners=new Map();
 for(const id of new Set([...listings,...reports].map(row=>row.user_id))){
  const legacy=source.prepare('SELECT email FROM pet_users WHERE id=?').get(id);
  const user=legacy&&await one('SELECT id FROM users WHERE lower(email)=lower($1)',[legacy.email]);
  if(!user)throw Error('Importação interrompida: responsável legado sem conta Marquesano correspondente. Nenhum dado importado.');
  owners.set(id,user.id);
 }
 async function insert(table,row,conflict='id'){
  const fields=Object.keys(row);
  await sql(`INSERT INTO ${table}(${fields.join(',')}) VALUES(${fields.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT(${conflict}) DO NOTHING`,Object.values(row));
 }
 await transaction(async()=>{
  for(const row of source.prepare('SELECT * FROM pet_categories').all())await insert('pet_categories',row,'slug');
  for(const row of listings){
   const existing=await one('SELECT user_id,slug FROM pet_listings WHERE id=$1',[row.id]);
   if(existing&&(existing.user_id!==owners.get(row.user_id)||existing.slug!==row.slug))throw Error('Conflito no anúncio legado. Importação revertida.');
   await insert('pet_listings',{...row,user_id:owners.get(row.user_id),moderation:row.moderation==='pendente'?'aprovado':row.moderation});
  }
  // These bytes already existed; new uploads must exclusively use R2.
  for(const row of source.prepare('SELECT * FROM pet_photos').all())await insert('pet_photos',row);
  for(const row of reports)await insert('pet_reports',{...row,user_id:owners.get(row.user_id)});
 });
 console.log(`Pets legado importado: ${listings.length} anúncio(s), ${source.prepare('SELECT COUNT(*) AS n FROM pet_photos').get().n} foto(s). SQLite de origem preservado.`);
} finally {
 source.close();
 if(database)await database.close();
}
