export const siteUrl = "https://marquesano.com.br";
export const siteTitle = "Marquesano | Sites Profissionais para Empresas";
export const siteDescription = "Criamos sites modernos, rápidos e responsivos para empresas que querem fortalecer sua presença digital e conquistar mais clientes.";
export const socialDescription = "Sites modernos, rápidos e responsivos para sua empresa crescer no digital.";
export const socialImage = {
  url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630, type: "image/jpeg",
  alt: "Marquesano — Sites profissionais para sua empresa. Planos mensais."
};

export function pageMetadata(path, title = siteTitle, description = siteDescription) {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;
  const previewDescription = path === "/" ? socialDescription : description;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "pt_BR", url, siteName: "Marquesano",
      title, description: previewDescription, images: [socialImage]
    },
    twitter: { card: "summary_large_image", title, description: previewDescription, images: [socialImage] }
  };
}
