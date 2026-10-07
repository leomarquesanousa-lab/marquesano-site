import { sql } from './db.mjs';
import { sections } from './constants.mjs';
import { siteUrl } from '../../config/site.mjs';

export async function petSitemap() {
 const visible="l.moderation='aprovado' AND (EXISTS (SELECT 1 FROM users u WHERE u.id=l.user_id AND u.active=1) OR EXISTS (SELECT 1 FROM pet_public_users u WHERE u.id=l.public_user_id AND u.active=1))";
 const [listings,categories,articles]=await Promise.all([
  sql(`SELECT l.slug,l.updated_at,l.city_slug,l.state,l.situation,l.category,l.status FROM pet_listings l WHERE ${visible} ORDER BY l.slug`),
  sql('SELECT slug FROM pet_categories WHERE active=1 ORDER BY slug'),
  sql('SELECT slug,updated_at FROM pet_articles WHERE published=1 ORDER BY slug')
 ]);
 const entries=new Map();
 const add=(path,updated)=>{const entry={url:siteUrl+path};if(updated&&!Number.isNaN(new Date(updated).getTime()))entry.lastModified=new Date(updated);entries.set(entry.url,entry);};
 for(const section of Object.keys(sections)){
  add('/pets/'+section);
  for(const category of categories)if(listings.some(p=>p.category===category.slug&&(sections[section].resolved?p.status==='reencontrado':p.status==='ativo'&&p.situation===sections[section].situation)))add('/pets/'+section+'/'+category.slug);
 }
 const activeCities=new Set(listings.filter(p=>p.status==='ativo').map(p=>p.state+'/'+p.city_slug));
 for(const pet of listings){
  add('/pets/pet/'+pet.slug,pet.updated_at);
  if(pet.status==='ativo')add(`/pets/cidades/${pet.state.toLowerCase()}/${pet.city_slug}`);
  const section=pet.status==='reencontrado'?'reencontrados':pet.status==='ativo'?({'perdido':'pets-perdidos','encontrado':'pets-encontrados','adocao':'adocao'})[pet.situation]:null;
  if(section&&activeCities.has(pet.state+'/'+pet.city_slug))add(`/pets/${section}/cidade/${pet.state.toLowerCase()}/${pet.city_slug}`);
 }
 for(const article of articles)add('/pets/guias/'+article.slug,article.updated_at);
 return [...entries.values()];
}
