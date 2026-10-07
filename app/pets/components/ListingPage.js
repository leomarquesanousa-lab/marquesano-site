import Link from 'next/link';
import SearchForm from './SearchForm';
import PetsStructuredData from './PetsStructuredData';
import {PetGrid} from './PetCard';
import {PageHeading} from './Shell';
import {listPets,getCategories} from '../lib/repository.mjs';
export default async function ListingPage({title,description,filters={},search={},path='/pets/buscar'}){
 const normalized=Object.fromEntries(Object.entries(search).filter(([,v])=>typeof v==='string'));
 const page=Math.min(10000,Math.max(1,parseInt(normalized.page||'1',10)||1));
 const query={...normalized,...filters};const {items,total}=await listPets(query,24,(page-1)*24);const categories=await getCategories();
 const link=n=>{const params=new URLSearchParams(normalized);params.set('page',String(n));return path+'?'+params;};
 return <>{path!=='/pets/buscar'&&<PetsStructuredData path={path} title={title} description={description} items={[[title,path]]}/>}<PageHeading title={title} description={description}/><div className="container listing-content"><SearchForm filters={query} categories={categories} action={path} locked={Object.keys(filters).filter(k=>k!=="resolved")}/><div className="results-heading"><p><strong>{total}</strong> {total===1?'pet encontrado':'pets encontrados'}{query.city?' em '+query.city:''}</p><span>Mais recentes primeiro</span></div><PetGrid pets={items} headingLevel={2}/>{total>24&&<nav className="pagination" aria-label="Paginação">{page>1&&<Link className="button secondary" href={link(page-1)}>Anterior</Link>}<span>Página {page} de {Math.ceil(total/24)}</span>{page*24<total&&<Link className="button secondary" href={link(page+1)}>Próxima</Link>}</nav>}</div></>;
}
