import {redirect,notFound} from 'next/navigation';
import {currentUser,ownsPet,isPetAdmin} from '../../../../lib/auth.mjs';
import {one} from '../../../../lib/db.mjs';
import {getPet,getCategories} from '../../../../lib/repository.mjs';
import {storageReady} from '../../../../lib/storage.mjs';
import PetForm from '../../../../components/PetForm';
import {PageHeading} from '../../../../components/Shell';
export const dynamic='force-dynamic';
export const metadata={title:'Editar anúncio',robots:{index:false,follow:false}};
export default async function Page({params}){const user=await currentUser();if(!user)redirect('/pets/minha-conta');const {id}=await params;const record=await one('SELECT slug,user_id,public_user_id FROM pet_listings WHERE id=$1',[id]);if(!record||!ownsPet(user,record)&&!isPetAdmin(user))notFound();const pet=await getPet(record.slug,user);return <><PageHeading title="Atualize essa história." description="Edite as informações e fotos do anúncio. As mudanças ficam disponíveis ao salvar."/><div className="container form-container"><PetForm storageAvailable={storageReady()} pet={pet} categories={await getCategories()} userName={user.name}/></div></>;}
