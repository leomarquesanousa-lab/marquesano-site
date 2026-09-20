import { publicPages, officialSite } from './server/seo.mjs';
export const dynamic='force-dynamic';
export default function sitemap() { return publicPages().filter(page=>page.indexable).map(page=>({url:officialSite+(page.path==='/'?'':page.path)})); }
