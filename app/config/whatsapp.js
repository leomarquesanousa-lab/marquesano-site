// Informe somente dígitos: código do país + DDD + número real.
// Enquanto vazio, o botão exibe um aviso local e não abre uma conversa fictícia.
export const whatsappConfig = {
  phone: "",
  message: "Olá! Gostaria de conversar sobre um site para meu negócio."
};

export function getWhatsAppUrl() {
  const phone = whatsappConfig.phone.replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappConfig.message)}` : null;
}
