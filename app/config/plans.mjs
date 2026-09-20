// Initial catalog only. Persisted values in the admin database take precedence.
export const initialPlans = [
  { id: 'basico', name: 'Básico', description: 'O primeiro passo para uma presença profissional.', monthly_price_cents: 9900, cycles: 12, active: true },
  { id: 'intermediario', name: 'Intermediário', description: 'Mais espaço para apresentar o valor do seu negócio.', monthly_price_cents: null, cycles: 12, active: false },
  { id: 'professional', name: 'Professional', description: 'Uma experiência conectada à sua operação.', monthly_price_cents: null, cycles: 12, active: false },
];
export const planFeatures = {
  basico: ['Site responsivo', 'Domínio .com.br sujeito à disponibilidade', 'Hospedagem e SSL', 'WhatsApp e formulário', 'Manutenção'],
  intermediario: ['Mais páginas e seções', 'Galeria e depoimentos', 'Analytics e SEO local', 'Alterações mensais'],
  professional: ['Agendamento', 'Formulários avançados', 'Integrações', 'Recursos sob medida'],
};
export const priceLabel = cents => cents == null ? 'Valor a confirmar' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
