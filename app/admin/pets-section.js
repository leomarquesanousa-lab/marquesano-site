import Link from 'next/link';
import PetLogo from '../pets/components/PetLogo';
import {dateLabel} from '../pets/lib/dates.mjs';
import {sql} from '../pets/lib/db.mjs';
import {AdminAction} from '../pets/components/AdminControls';
import styles from './admin.module.css';
export default async function PetsSection({search={}}){
 const page=Math.max(1,Math.min(10000,parseInt(search.page||'1',10)||1));
 const rows=await sql('SELECT l.*,COALESCE(p.name,u.name) AS owner_name FROM pet_listings l LEFT JOIN users u ON u.id=l.user_id LEFT JOIN pet_public_users p ON p.id=l.public_user_id ORDER BY l.created_at DESC LIMIT 31 OFFSET $1',[(page-1)*30]);
 return <section className={styles.panel}><PetLogo context="admin"/><p><Link href="/pets">Abrir portal Pets</Link> · <Link href="/pets/publicar">Publicar anúncio</Link></p><p>Publicação imediata. A administração pode editar ou ocultar anúncios posteriormente.</p>{!rows.length&&<p>Nenhum anúncio cadastrado.</p>}{rows.slice(0,30).map(p=><article key={p.id} style={{padding:'16px 0',borderBottom:'1px solid #ddd'}}><h2>{p.title}</h2><p>Data do ocorrido: {dateLabel(p.event_date)}</p><p>{p.city}/{p.state} · {p.owner_name} · {p.moderation==='oculto'?'Oculto':'Publicado'} · {p.status}</p><p><Link href={'/pets/pet/'+p.slug}>Ver anúncio</Link> · <Link href={'/pets/minha-conta/anuncios/'+p.id+'/editar'}>Editar</Link></p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><AdminAction endpoint="moderation" data={{id:p.id,moderation:p.moderation==='oculto'?'aprovado':'oculto'}}>{p.moderation==='oculto'?'Exibir':'Ocultar'}</AdminAction><AdminAction endpoint="status" data={{id:p.id,status:'resolvido'}}>Marcar resolvido</AdminAction><AdminAction endpoint="delete" data={{id:p.id}}>Excluir</AdminAction></div></article>)}<p>{page>1&&<Link href={'/admin/pets?page='+(page-1)}>Anterior</Link>} {rows.length>30&&<Link href={'/admin/pets?page='+(page+1)}>Próxima</Link>}</p></section>;
}
