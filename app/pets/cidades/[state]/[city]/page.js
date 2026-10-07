import {notFound} from 'next/navigation';
import {cities} from '../../../lib/repository.mjs';
import {meta} from '../../../lib/seo.mjs';
import ListingPage from '../../../components/ListingPage';
async function resolve(params){const {state,city}=await params;const found=(await cities()).find(c=>c.state.toLowerCase()===state&&c.city_slug===city);if(!found)notFound();return {...found,path:`/pets/cidades/${state}/${city}`};}
export const dynamic='force-dynamic';
export async function generateMetadata({params,searchParams}){const c=await resolve(params);return {...meta(c.path,'Pets em '+c.city+' - '+c.state,'Encontre pets perdidos, encontrados e para adoção em '+c.city+' - '+c.state+'. Consulte anúncios com fotos e localização aproximada e ajude na sua região.'),...(Object.keys(await searchParams).length?{robots:{index:false,follow:true}}:{})};}
export default async function Page({params,searchParams}){const c=await resolve(params);return <ListingPage path={c.path} title={'Pets em '+c.city+' · '+c.state} description="Pets perdidos, encontrados e para adoção. Conecte-se com sua comunidade." filters={{city_slug:c.city_slug,city:c.city,state:c.state}} search={await searchParams}/>;}
