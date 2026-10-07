import {redirect} from 'next/navigation';
import {currentUser} from '../lib/auth.mjs';
import {getCategories} from '../lib/repository.mjs';
import {meta} from '../lib/seo.mjs';
import {storageReady} from '../lib/storage.mjs';
import PetForm from '../components/PetForm';
import {PageHeading} from '../components/Shell';
export const dynamic='force-dynamic';
export const metadata={...meta('/pets/publicar','Publicar anúncio'),robots:{index:false,follow:false}};
export default async function Page({searchParams}){const search=await searchParams;const situation=['perdido','encontrado','adocao'].includes(search.situation)?search.situation:'perdido';const user=await currentUser();if(!user)redirect('/pets/login?next='+encodeURIComponent('/pets/publicar?situation='+situation));return <><PageHeading title="Vamos ajudar esse pet." description="Publique um anúncio gratuito. Quanto mais claras as informações, maiores as chances de um bom encontro."/><div className="container form-container"><PetForm storageAvailable={storageReady()} categories={await getCategories()} situation={situation} userName={user.name}/></div></>;}
