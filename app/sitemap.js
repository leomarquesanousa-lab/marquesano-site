import { publicPages, officialSite } from './server/seo.mjs';
import { petSitemap } from './pets/lib/sitemap.mjs';
export const dynamic='force-dynamic';
export default async function sitemap() {
 const pages=publicPages().filter(page=>page.indexable).map(page=>({url:officialSite+(page.path==='/'?'':page.path)}));
 const pets=await petSitemap();
 return [...new Map([...pages,...pets].map(entry=>[entry.url,entry])).values()];
}
