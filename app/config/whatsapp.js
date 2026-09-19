// Informe somente dígitos: código do país + DDD + número real.
// Enquanto vazio, o botão exibe um aviso local e não abre uma conversa fictícia.
export const whatsappConfig = {
  phone: "5511940702998",
  message: ""
};

export function getWhatsAppUrl() {
  const phone = whatsappConfig.phone.replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}${whatsappConfig.message ? `?text=${encodeURIComponent(whatsappConfig.message)}` : ""}` : null;
}
