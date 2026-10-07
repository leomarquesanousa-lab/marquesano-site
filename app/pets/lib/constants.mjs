export const categories = [
  ['cachorros','Cachorros','dog'], ['gatos','Gatos','cat'], ['aves','Aves','bird'],
  ['coelhos','Coelhos','rabbit'], ['pequenos-animais','Pequenos animais','small'],
  ['repteis','Répteis','reptile'], ['cavalos','Cavalos','horse'], ['outros','Outros','paw'],
];
export const situations = { perdido:'Perdido', encontrado:'Encontrado', adocao:'Para adoção' };
export const statuses = { ativo:'Em aberto', reencontrado:'Reencontrado', adotado:'Adotado', resolvido:'Resolvido' };
export const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
export const sections = { 'pets-perdidos':{title:'Pets perdidos',situation:'perdido',description:'Encontre anúncios de pets perdidos no Brasil. Consulte fotos, características e localização aproximada para ajudar nas buscas.'}, 'pets-encontrados':{title:'Pets encontrados',situation:'encontrado',description:'Consulte anúncios de animais encontrados no Brasil e ajude a localizar seus responsáveis. Busque por espécie, cidade e bairro.'}, adocao:{title:'Pets para adoção',situation:'adocao',description:'Conheça pets para adoção responsável no Brasil. Veja fotos e informações reais dos anúncios e converse com o responsável.'}, reencontrados:{title:'Histórias de reencontro',resolved:true,description:'Laços que se encontraram outra vez. Cada reencontro importa.'} };
export function slugify(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
export const categoryName = slug => categories.find(c=>c[0]===slug)?.[1] || slug;
export {dateLabel} from './dates.mjs';
