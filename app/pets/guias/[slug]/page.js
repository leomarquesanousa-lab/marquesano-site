import Link from 'next/link';
import {notFound} from 'next/navigation';
import {one} from '../../lib/db.mjs';
import {meta} from '../../lib/seo.mjs';
import PetsStructuredData from '../../components/PetsStructuredData';
import {PageHeading} from '../../components/Shell';
export const dynamic='force-dynamic';
async function article(params){const {slug}=await params;const a=await one('SELECT * FROM pet_articles WHERE slug=$1 AND published=1',[slug]);if(!a)notFound();return a;}
export async function generateMetadata({params}){const a=await article(params);return {...meta('/pets/guias/'+a.slug,a.title,a.excerpt),openGraph:{...meta('/pets/guias/'+a.slug,a.title,a.excerpt).openGraph,type:'article',modifiedTime:a.updated_at}};}
export default async function Page({params}){const a=await article(params);return <><PageHeading eyebrow="GUIA PRÁTICO" title={a.title} description={a.excerpt}/><div className="container article-container"><PetsStructuredData path={'/pets/guias/'+a.slug} title={a.title} description={a.excerpt} article={a} items={[['Guias','/pets/guias'],[a.title,'/pets/guias/'+a.slug]]}/><article className="article-body">{JSON.parse(a.body).map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<Link className="button" href="/pets/publicar">Publicar um anúncio</Link></article><p style={{marginTop:24}}><Link className="text-link" href="/pets/guias">← Voltar para todos os guias</Link></p></div></>;}
