import { siteUrl } from '../../config/site.mjs';
import { categoryName } from './constants.mjs';
export { siteUrl };
export const siteDescription = 'Divulgue gratuitamente pets perdidos, encontrados e para adoção no Brasil. Compartilhe anúncios e ajude animais a reencontrar suas famílias.';
export function meta(path,title,description=siteDescription,image='/api/pet-assets/social') {
 const branded=title+' | Pet Find';
 return {title:{absolute:branded},description,robots:{index:true,follow:true},alternates:{canonical:siteUrl+path},openGraph:{title:branded,description,url:siteUrl+path,siteName:'Pet Find',locale:'pt_BR',type:'website',images:[{url:new URL(image,siteUrl).href,alt:title}]},twitter:{card:'summary_large_image',title:branded,description,images:[new URL(image,siteUrl).href]}};
}
export function petSeo(pet) {
 const animal=({cachorros:'Cachorro',gatos:'Gato',aves:'Ave',coelhos:'Coelho',repteis:'Réptil',cavalos:'Cavalo'})[pet.category]||({'pequenos-animais':'Pequeno animal',outros:'Pet'})[pet.category]||pet.category_name||categoryName(pet.category);
 const situation=pet.situation==='adocao'?'para adoção':pet.situation==='perdido'?(pet.category==='aves'?'perdida':'perdido'):(pet.category==='aves'?'encontrada':'encontrado');
 const location=[pet.city,pet.state].filter(Boolean).join(' - ');
 const title=animal+' '+situation+(location?' em '+location:'');
 const facts=[pet.name&&'Nome: '+pet.name,pet.breed&&'Raça: '+pet.breed,pet.neighborhood&&'Bairro: '+pet.neighborhood].filter(Boolean).join('. ');
 const summary=pet.description.replace(/\s+/g,' ').trim();
 return {title,description:(title+'. '+(facts?facts+'. ':'')+summary).slice(0,160)};
}
export function breadcrumb(items) {
 return {'@type':'BreadcrumbList',itemListElement:items.map(([name,path],i)=>({'@type':'ListItem',position:i+1,name,item:siteUrl+path}))};
}
