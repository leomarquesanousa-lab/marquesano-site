import ListingPage from '../components/ListingPage';
import {meta} from '../lib/seo.mjs';
export const dynamic='force-dynamic';
export const metadata={...meta('/pets/buscar','Encontre um pet na sua região'),robots:{index:false,follow:true}};
export default async function Page({searchParams}) {return <ListingPage title="Encontre um pet na sua região" description="Procure por cidade, bairro e características. Sua ajuda pode fazer a diferença." search={await searchParams}/>;}
