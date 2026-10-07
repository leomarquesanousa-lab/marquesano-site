import { siteUrl } from './config/site.mjs';
export default function robots() {
 return {rules:[{userAgent:'*',allow:['/','/api/portal/photos/','/api/pet-assets/'],disallow:['/admin','/administracao','/api/','/checkout/','/assinar/','/assinatura/','/pets/login','/pets/cadastro','/pets/minha-conta','/pets/meus-anuncios','/pets/publicar']}],sitemap:siteUrl+'/sitemap.xml',host:siteUrl};
}
