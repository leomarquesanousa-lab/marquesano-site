import { siteUrl, siteTitle, siteDescription } from '../config/metadata';
export default function StructuredData({path='/',title=siteTitle,description=siteDescription,service=false,faq=[]}) {
  const url=siteUrl+(path==='/'?'':path);
  const graph=[{'@type':'Organization','@id':siteUrl+'/#organization',name:'Marquesano',url:siteUrl,logo:siteUrl+'/images/logoazul.png'}, {'@type':'WebSite','@id':siteUrl+'/#website',name:'Marquesano',url:siteUrl,inLanguage:'pt-BR',publisher:{'@id':siteUrl+'/#organization'}}, {'@type':'WebPage','@id':url+'#page',url,name:title,description,inLanguage:'pt-BR',isPartOf:{'@id':siteUrl+'/#website'}}];
  if(path!=='/'){
    const items=[['Início','/']];
    if(path.startsWith('/exemplos/'))items.push(['Portfólio','/portfolio']);
    if(path==='/exemplos/restaurante/menu')items.push(['Site demonstrativo para restaurante','/exemplos/restaurante']);
    items.push([title,path]);
    graph.push({'@type':'BreadcrumbList',itemListElement:items.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item:siteUrl+(item==='/'?'':item)}))});
  }
  if(service)graph.push({'@type':'Service',name:'Criação de sites profissionais por assinatura',serviceType:'Criação e manutenção de sites',areaServed:{'@type':'Country',name:'Brasil'},provider:{'@id':siteUrl+'/#organization'},url});
  if(faq.length)graph.push({'@type':'FAQPage',mainEntity:faq.map(({question,answer})=>({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}}))});
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}}/>;
}
