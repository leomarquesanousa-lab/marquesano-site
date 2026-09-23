# Vendas e assinaturas

`/admin/vendas` e `/api/admin/vendas` são exclusivos de OWNER/ADMIN, com a sessão e proteção de Origin existentes. O resumo do dashboard consulta `/api/admin/vendas/resumo`. Detalhes: `/admin/vendas/{id}` e `/api/admin/vendas/{id}`. O painel atualiza a leitura a cada 30 segundos enquanto a aba está visível.

## Persistência

A migração 7 é transacional e aplicada uma única vez pelo mecanismo existente. Reutiliza `mp_subscriptions`, `mp_payments`, `mp_invoices`, `mp_webhook_events`, `subscription_plans`, `checkout_attempts` e o cadastro `clients`. Não altera preços ou IDs de planos.

Campos novos em assinaturas: `created_at`, `external_reference`, `amount_cents`, `currency`, `cycles`, `end_date`, `cancelled_at`. Em pagamentos: `created_at`, `payment_method`, `last_four`, `external_reference`, `refunded_at`, `refunded_cents`. Apenas os quatro últimos dígitos são aceitos; nenhum token, PAN ou CVV é persistido.

Dados antigos são preservados. A migração recupera data, preço e referência apenas de tentativas de checkout autorizadas que já estavam registradas. Não substitui valor histórico pelo preço atual do catálogo. Campos ausentes permanecem “Não informado” até confirmação da API. O vínculo com cadastro de cliente só é exibido se houver um único cliente com aquele e-mail.

Receita mensal: pagamentos vinculados a assinaturas, aprovados em BRL no mês corrente (São Paulo), menos estornos informados nesses pagamentos. Não é uma conciliação contábil de caixa por data do estorno. Receita recorrente prevista: soma de valores conhecidos das assinaturas autorizadas em BRL. Registros sem valor aparecem no aviso do painel. Autorização não é pagamento aprovado.

Ciclos pagos contam faturas distintas aprovadas (ou payment ID quando não há fatura). Restante previsto é quantidade restante × valor mensal confirmado, sem prometer recebimento. Próximos vencimentos usam `next_payment_date` oficial; não são calculados adicionando um mês. Datas finais/cancelamento só aparecem quando confirmadas. “Em atraso”/“Finalizada” só são exibidos quando o estado correspondente consta no recurso, sem inferir inadimplência de uma data antiga.

## Sincronização e webhooks

Preservados assinatura HMAC, consulta autoritativa e controle de versão dos eventos `subscription_preapproval`, `subscription_authorized_payment`, `payment`.

`POST /api/admin/vendas/sync` percorre assinaturas locais por cursor, consulta `/preapproval/{id}`, busca `/authorized_payments/search?preapproval_id=...` com paginação e confirma cada fatura/pagamento na API. Nunca cria assinatura ou cobrança. O navegador prossegue pelas páginas e mostra contagens e erros individuais. Interromper a página interrompe os próximos lotes; executar novamente é seguro. API oficial: https://www.mercadopago.com.ar/developers/pt/reference/online-payments/subscriptions/overview

## E-mails

Reutiliza Resend, `RESEND_API_KEY` e `CONTACT_FROM_EMAIL` (remetente verificado no provedor). Nenhuma credencial nova. Templates: confirmação da assinatura, pagamento aprovado, pagamento recusado, cancelamento. Mensagens de recusa não incluem códigos do Mercado Pago.

`sales_notifications` é uma fila durável e histórico, criada na mesma transação que o evento financeiro. Chaves únicas por tipo/recurso impedem duplicação por webhook, sincronização ou checkout. O envio ocorre após o commit. Falha no provedor não desfaz assinatura/pagamento. Sem credenciais de e-mail, fica PENDING. A confirmação via checkout acrescenta somente persistência de dados e envio após commit: não modifica CardForm, payload ou arquitetura `/preapproval`.

Há exclusão concorrente por lease e Idempotency-Key no Resend. Tentativas usam o mesmo payload imutável. Resend mantém chaves por 24h; mensagens sem confirmação depois de 23h ficam REVIEW, sem reenvio automático. Conferir no provedor antes de qualquer ação manual. SENT significa aceito pelo Resend, não prova de entrega na caixa de entrada. Documentação: https://resend.com/docs/dashboard/emails/idempotency-keys

Para retomar pendências sem depender de novos webhooks, agendar no ambiente do servidor (por exemplo a cada minuto):

```sh
node app/scripts/sales-notifications.mjs
```

O agendador deve receber as mesmas variáveis do servidor. Para teste local com arquivo de ambiente explícito: `node --env-file=.env app/scripts/sales-notifications.mjs`. Esse comando envia e-mails reais pendentes; não executá-lo em testes automatizados. Não foi agendado/deployado nesta implementação.

WhatsApp reutilizado de `app/config/whatsapp.js`: `5511940702998`. CTA: `https://wa.me/5511940702998?text=` seguido da mensagem codificada “Olá, sou cliente da Marquesano e gostaria de falar sobre minha assinatura.”

## Validação sem cobranças/e-mails reais

`scripts/sales.test.mjs` usa PostgreSQL isolado via PGlite e mocks de transporte MP/Resend. Não lê credenciais reais. Execute com `ADMIN_PGLITE_MODULE` apontando para a instalação de testes já existente, juntamente com as suítes de checkout/webhook. Nenhuma migração foi executada no banco de produção durante a implementação.

Resultado: 61 testes aprovados nas suítes de vendas, interface de vendas, checkout, interface de checkout, webhooks, PostgreSQL e homologação. A suíte adicional `operations.test.mjs` teve 8 aprovações e 1 falha preexistente: o diagnóstico SEO não reconhece metadados de `/checkout/homologacao`. Esses arquivos de SEO/homologação não foram alterados.

`node app/scripts/sales-visual-check.mjs` renderiza fixtures isoladas, sem banco ou rede externa, usando Chrome/Edge instalado: 14 verificações aprovadas (lista, estado vazio, detalhe e quatro templates, em 390 e 1280 px). Não envia e-mail nem pagamento.

## Arquivos desta implementação

- `admin/[[...path]]/page.js`
- `admin/operations.js`
- `admin/sales-section.js`
- `admin/VENDAS.md`
- `server/admin/api.mjs`
- `server/admin/core.mjs`
- `server/admin/billing-store.mjs`
- `server/admin/card-checkout.mjs`
- `server/admin/mercadopago-webhook.mjs`
- `server/admin/migrations.mjs`
- `server/admin/repository.mjs`
- `server/admin/sales-api.mjs`
- `server/admin/sales-mail.mjs`
- `server/admin/sales-migration.mjs`
- `server/admin/sales-store.mjs`
- `scripts/card-checkout.test.mjs`
- `scripts/operations.test.mjs`
- `scripts/sales-notifications.mjs`
- `scripts/sales-ui-render.cjs`
- `scripts/sales-ui.test.cjs`
- `scripts/sales-visual-check.mjs`
- `scripts/sales.test.mjs`
