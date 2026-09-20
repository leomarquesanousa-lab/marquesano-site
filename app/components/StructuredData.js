import { siteUrl, siteTitle, siteDescription } from '../config/metadata';
export default function StructuredData({path='/',title=siteTitle,description=siteDescription,service=false}) {
  const url=siteUrl+(path==='/'?'':path);
  const graph=[{'@type':'Organization','@id':siteUrl+'/#organization',name:'Marquesano',url:siteUrl,logo:siteUrl+'/images/logoazul.png'}, {'@type':'WebSite','@id':siteUrl+'/#website',name:'Marquesano',url:siteUrl,inLanguage:'pt-BR',publisher:{'@id':siteUrl+'/#organization'}}, {'@type':'WebPage','@id':url+'#page',url,name:title,description,isPartOf:{'@id':siteUrl+'/#website'}}];
  if(path!=='/')graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:siteUrl},{'@type':'ListItem',position:2,name:title,item:url}]});
  if(service)graph.push({'@type':'Service',name:'Criação de sites profissionais',serviceType:'Criação e manutenção de sites',provider:{'@id':siteUrl+'/#organization'},url});
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}}/>;
}
