import {notFound} from 'next/navigation';
import {sections,states} from '../../lib/constants.mjs';
import {getCategories,cities,listPets} from '../../lib/repository.mjs';
import ListingPage from '../../components/ListingPage';
import {meta} from '../../lib/seo.mjs';
export const dynamic='force-dynamic';
async function resolve(params){
 const {section,segments=[]}=await params;const info=sections[section];if(!info)notFound();
 const filters=info.resolved?{resolved:true}:{situation:info.situation};let title=info.title;
 if(segments.length){
  if(segments.length===1){const category=(await getCategories()).find(c=>c.slug===segments[0]);if(!category)notFound();filters.category=category.slug;title+=(section==='adocao'?' — ':' — ')+category.name;}
  else if(segments.length===3&&segments[0]==='cidade'&&states.includes(segments[1].toUpperCase())){const city=(await cities()).find(c=>c.city_slug===segments[2]&&c.state.toLowerCase()===segments[1]);if(!city)notFound();filters.city_slug=city.city_slug;filters.city=city.city;filters.state=city.state;title+=' em '+city.city+' · '+city.state;if(!(await listPets(filters,1)).total)notFound();}
  else notFound();
 }
 return {...info,title,description:segments.length?title+'. '+info.description:info.description,filters,path:'/pets/'+[section,...segments].join('/')};
}
export async function generateMetadata({params,searchParams}){const info=await resolve(params);const search=await searchParams;return {...meta(info.path,info.title,info.description),...(Object.keys(search).length?{robots:{index:false,follow:true}}:{})};}
export default async function Page({params,searchParams}){const info=await resolve(params);return <ListingPage {...info} search={await searchParams}/>;}
