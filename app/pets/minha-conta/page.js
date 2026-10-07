import Link from 'next/link';
import {currentUser,isPetAdmin} from '../lib/auth.mjs';
import {myPets} from '../lib/repository.mjs';
import {meta} from '../lib/seo.mjs';
import {statuses,situations,dateLabel} from '../lib/constants.mjs';
import {redirect} from 'next/navigation';
import {PageHeading} from '../components/Shell';
import {PetActions,Logout} from '../components/AccountActions';
import {EmptyState} from '../components/PetCard';
export const dynamic='force-dynamic';
export const metadata={...meta('/pets/minha-conta','Minha conta e meus anúncios'),robots:{index:false,follow:false}};
export default async function Page({searchParams}){const user=await currentUser();const search=await searchParams;
 if(!user)redirect('/pets/login'+(typeof search.next==='string'?'?next='+encodeURIComponent(search.next):''));
 const pets=await myPets(user);return <><PageHeading eyebrow="SEU ESPAÇO" title={'Olá, '+user.name.split(' ')[0]+'.'} description="Acompanhe, atualize e compartilhe seus anúncios."/><div className="container account-content">{search.saved&&<p role="status" className="success-message">Anúncio salvo. Ele já está publicado.</p>}<div className="account-toolbar"><p><strong>{pets.length}</strong> anúncios · {user.email}</p><div className="account-pet-actions"><Link href="/pets/publicar" className="button">Publicar anúncio</Link>{isPetAdmin(user)&&<Link href="/admin/pets" className="button secondary">Administração</Link>}<Logout admin={user.kind==='admin'}/></div></div>{pets.length?<div className="account-list">{pets.map(p=><article className="account-pet" key={p.id}>{p.photo_id&&<img src={'/api/portal/photos/'+p.photo_id} alt={p.name||p.title} width="120" height="110"/>}<div className="account-pet-content"><span className="tag">{situations[p.situation]}</span><span className="tag">{statuses[p.status]}</span><span className="tag">{p.moderation==='pendente'?'Publicado':p.moderation==='oculto'?'Oculto':'Publicado'}</span><h2>{p.title}</h2><p>Data do ocorrido: {dateLabel(p.event_date)}</p><p>{p.neighborhood} · {p.city}/{p.state}</p><PetActions pet={{id:p.id,slug:p.slug,status:p.status,situation:p.situation}}/></div></article>)}</div>:<EmptyState title="Sua primeira história começa aqui." description="Publique um anúncio de pet perdido, encontrado ou para adoção."/>}</div></>;
}
