import PetsStructuredData from '../components/PetsStructuredData';
import Link from 'next/link';
import {sql} from '../lib/db.mjs';
import {meta} from '../lib/seo.mjs';
import {PageHeading} from '../components/Shell';
import Icon from '../components/Icon';
export const dynamic='force-dynamic';
export const metadata=meta('/pets/guias','Guias para encontrar pets perdidos e adotar','Orientações para procurar um pet perdido, ajudar animais encontrados e realizar uma adoção responsável. Guias gratuitos do Pet Find.');
export default async function Page(){const articles=await sql('SELECT slug,title,excerpt FROM pet_articles WHERE published=1 ORDER BY title');return <><PetsStructuredData path="/pets/guias" title="Guias para encontrar pets perdidos e adotar" description={metadata.description} items={[["Guias para encontrar pets perdidos e adotar","/pets/guias"]]}/><PageHeading eyebrow="INFORMAÇÃO TAMBÉM É CUIDADO" title="Guias para os próximos passos." description="Orientações práticas para organizar buscas, ajudar animais encontrados e adotar com responsabilidade."/><div className="container article-grid">{articles.map(a=><Link href={'/pets/guias/'+a.slug} className="article-card" key={a.slug}><span className="eyebrow">GUIA PRÁTICO</span><h2>{a.title}</h2><p>{a.excerpt}</p><span className="text-link">Ler guia <Icon name="arrow" size={18}/></span></Link>)}</div></>;}
