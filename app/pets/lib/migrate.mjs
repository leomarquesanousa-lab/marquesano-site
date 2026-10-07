import { readFile } from 'node:fs/promises';
import { categories } from './constants.mjs';
import { articles } from './articles.mjs';

// Called explicitly by the migration command, never by a page or db().
export async function migratePets(adapter){
 return adapter.transaction(async()=>{
  await adapter.exec('CREATE TABLE IF NOT EXISTS pet_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  for(const version of ['001_pet_portal','002_marquesano_integration','003_public_users']){
   if(await adapter.prepare('SELECT version FROM pet_migrations WHERE version=?').get(version))continue;
   await adapter.exec(await readFile(new URL('../migrations/'+version+'.sql',import.meta.url),'utf8'));
   const now=new Date().toISOString();
   if(version==='001_pet_portal'){
    for(const [slug,name] of categories)await adapter.prepare('INSERT INTO pet_categories(slug,name) VALUES(?,?) ON CONFLICT(slug) DO NOTHING').run(slug,name);
    for(const a of articles)await adapter.prepare('INSERT INTO pet_articles(slug,title,excerpt,body,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(slug) DO NOTHING').run(a.slug,a.title,a.excerpt,JSON.stringify(a.body),now);
   }
   await adapter.prepare('INSERT INTO pet_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING').run(version,now);
  }
 });
}
