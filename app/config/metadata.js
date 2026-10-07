import { siteUrl } from './site.mjs';
export { siteUrl };
export const siteTitle = "Criação de sites por assinatura para empresas | Marquesano";
export const siteDescription = "Criação de sites profissionais para pequenas empresas no Brasil. Planos por assinatura com hospedagem, manutenção e suporte; domínio conforme o plano.";
export const socialDescription = "Sites modernos, rápidos e responsivos para sua empresa crescer no digital.";
export const socialImage = {
  url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630, type: "image/jpeg",
  alt: "Marquesano — Sites profissionais para sua empresa. Planos mensais."
};

export function pageMetadata(path, title = siteTitle, description = siteDescription) {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;
  const previewDescription = path === "/" ? socialDescription : description;
  return {
    title, description, robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "pt_BR", url, siteName: "Marquesano",
      title, description: previewDescription, images: [socialImage]
    },
    twitter: { card: "summary_large_image", title, description: previewDescription, images: [socialImage] }
  };
}
