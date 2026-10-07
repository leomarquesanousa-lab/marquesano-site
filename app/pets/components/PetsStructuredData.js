import { siteUrl, breadcrumb } from '../lib/seo.mjs';
export default function PetsStructuredData({path='/pets',title='Pet Find',description,items=[],article}) {
 const url=siteUrl+path;
 const graph=[{'@type':'WebPage','@id':url+'#page',url,name:title,description,inLanguage:'pt-BR',isPartOf:{'@id':siteUrl+'/#website'},publisher:{'@id':siteUrl+'/#organization'}}];
 if(path==='/pets')graph.push({'@type':'Organization','@id':siteUrl+'/#organization',name:'Marquesano',url:siteUrl,logo:siteUrl+'/images/logoazul.png'},{'@type':'WebSite','@id':siteUrl+'/#website',name:'Marquesano',url:siteUrl,inLanguage:'pt-BR',publisher:{'@id':siteUrl+'/#organization'}});
 if(items.length)graph.push(breadcrumb([['Pet Find','/pets'],...items]));
 if(article)graph.push({'@type':'Article',headline:article.title,description:article.excerpt,dateModified:article.updated_at,inLanguage:'pt-BR',mainEntityOfPage:url,image:siteUrl+'/api/pet-assets/social',publisher:{'@type':'Organization',name:'Marquesano',url:siteUrl,logo:{'@type':'ImageObject',url:siteUrl+'/images/logoazul.png'}}});
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}}/>;
}
