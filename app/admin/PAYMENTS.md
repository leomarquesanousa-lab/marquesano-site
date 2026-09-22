# Planos e Mercado Pago

Em **Configurações → Pagamentos**, OWNER e ADMIN podem editar e sincronizar cada plano separadamente. Valores são persistidos na tabela `subscription_plans` do PostgreSQL administrativo. A migração 3 é automática ao abrir o banco; use armazenamento persistente e os procedimentos de backup existentes.

O catálogo inicial está em `app/config/plans.mjs`. Depois da primeira migração, editar esse arquivo não substitui valores salvos: utilize o admin.

| Código interno preservado | Nome público | Mensalidade inicial | Estado inicial |
| --- | --- | --- | --- |
| basico | Básico | R$ 99,00 | Ativo, pendente de sincronização |
| intermediario | Professional | Não definida | Inativo |
| professional | Business | Não definida | Inativo |

Os R$ 99 e a duração inicial de 12 cobranças mensais vêm do site anterior. Os preços antigos de R$ 149 e R$ 249 não foram associados aos novos planos, pois não foram confirmados. Preço, nome, descrição, ciclos e ativo/inativo podem ser alterados individualmente no admin. Valores monetários são inteiros em centavos no banco e na API, convertidos para reais somente na apresentação e no payload do Mercado Pago.

## Configuração

- `MERCADOPAGO_PUBLIC_KEY`: chave pública para o CardForm oficial, da mesma aplicação/ambiente do Access Token.
- `MERCADOPAGO_ACCESS_TOKEN`: credencial exclusivamente do servidor; use credencial da conta/aplicativo correto.
- `ADMIN_SITE_ORIGIN`: origem HTTPS do site, já usada pelo admin.
- `DATABASE_URL`: banco privado e persistente já utilizado pelo admin.
- Confirmação da contratação: `https://marquesano.com.br/checkout/sucesso`. O retorno legado dos planos já sincronizados permanece preservado.

Somente a Public Key chega ao navegador, para o SDK oficial. O Access Token fica exclusivamente no servidor, cujas chamadas utilizam `fetch` nativo.

## Operação

1. Confirme preço e ciclos de cada plano, ative e salve.
2. Use **Sincronizar com Mercado Pago** no plano escolhido. A primeira sincronização faz `POST /preapproval_plan`; as seguintes fazem `PUT /preapproval_plan/{id}`. O ID retornado fica vinculado somente àquele plano.
3. A home e `/planos` consultam o mesmo catálogo. Cada botão leva a `/checkout/{codigo}`, com tokenização do cartão na mesma tela e confirmação pelo backend.
4. O backend verifica o plano remoto antes de criar a assinatura, recusando divergências de ID, valor, moeda, frequência, ciclos, status ou condições extras de cobrança. Edições locais bloqueiam novas contratações até a sincronização.

Atualizar um plano no provedor pode afetar assinaturas vinculadas. A inativação local bloqueia o checkout do site imediatamente; sincronize o plano inativo para atualizar o status remoto. Ela não é um cancelamento individual de assinaturas existentes.

O campo `mercadopago_plan_id` permite vincular um plano existente antes da primeira sincronização. Confira sua titularidade e condições: sincronizar irá aplicar os valores salvos a esse ID. Um ID não pode ser usado em dois planos locais nem substituído depois de vinculado.

Se uma criação tiver resultado desconhecido (timeout, falha de rede ou reinício), não repetimos o POST automaticamente. Confira o painel Mercado Pago e informe o ID criado. Se não houver plano criado, crie-o no painel do provedor e informe esse ID antes de sincronizar. Uma sincronização em andamento bloqueia edição por até 60 segundos; após reinício, recarregue o admin.

## Webhook de assinaturas e pagamentos

Cadastre a URL pública **https://marquesano.com.br/api/mercadopago/webhook** em **Mercado Pago Developers → Suas integrações → sua aplicação → Webhooks → Configurar notificações**. O endpoint aceita `POST` sem sessão administrativa. Selecione o ambiente correspondente às credenciais utilizadas.

Habilite os seguintes tópicos de criação e atualização:

| Nome no painel Mercado Pago | Tópico |
| --- | --- |
| Planos e assinaturas | `subscription_preapproval` |
| Planos e assinaturas | `subscription_authorized_payment` |
| Pagamentos | `payment` |

Se a seleção agrupada também enviar `subscription_preapproval_plan`, essa notificação é validada e ignorada: o webhook não altera o catálogo dos três planos.

Ao salvar a configuração, revele a **assinatura secreta** gerada na seção Webhooks. Configure seu valor como `MERCADOPAGO_WEBHOOK_SECRET` no servidor e reinicie/republique a aplicação para carregar a variável. Ela é diferente de `MERCADOPAGO_ACCESS_TOKEN`, pertence à aplicação/ambiente e não deve receber prefixo `NEXT_PUBLIC_`. Ao redefinir a assinatura no Mercado Pago, atualize também a variável no servidor.

Variáveis necessárias:

- `MERCADOPAGO_WEBHOOK_SECRET`: assinatura secreta dos Webhooks.
- `MERCADOPAGO_ACCESS_TOKEN`: token da mesma conta/aplicação, exclusivamente no servidor.
- `ADMIN_SITE_ORIGIN=https://marquesano.com.br`: origem HTTPS usada para exibir a URL.
- `DATABASE_URL`: URL de conexao PostgreSQL do admin.

Em **Configurações → Pagamentos → Assinaturas e pagamentos**, o painel mostra URL, presença do secret, configuração do servidor e última notificação processada. “Configurado no servidor” não verifica o cadastro no painel Mercado Pago; confirme também esse cadastro. O histórico é atualizado a cada 15 segundos e possui paginação.

### Validação e persistência

A assinatura é verificada com HMAC-SHA256 e comparação em tempo constante, usando `x-signature`, `x-request-id` e o `data.id` da query string. O manifesto é `id:{data.id em minúsculas};request-id:{x-request-id};ts:{ts};`. ID da URL e do JSON devem corresponder. Não há exceção que aceite simulações sem assinatura nem confiança no header HTTP `Origin` como autenticação do provedor.

Em cada entrega, o servidor confirma os recursos nos endpoints oficiais `/preapproval/{id}`, `/authorized_payments/{id}` e `/v1/payments/{id}`. A conta recebedora é conferida com `/users/me`. O status enviado no corpo da notificação não é utilizado para aprovar pagamentos. Para o tópico `payment`, a relação com uma assinatura é obtida pela busca oficial de faturas por `payment_id`, seguida da consulta da fatura e assinatura. Nunca vinculamos por e-mail ou referência fornecida no webhook.

A migração 4 acrescenta `mp_subscriptions`, `mp_invoices`, `mp_payments` e `mp_webhook_events`, preservando os três planos. São armazenados status, próxima cobrança quando disponível, IDs externos, valores, moeda, datas e contato disponibilizado na assinatura. Tokens, dados de cartão e payloads completos não são gravados nem enviados ao painel.

As gravações ocorrem em uma transação. IDs externos únicos e identificação de eventos baseada no recurso confirmado evitam duplicações, mesmo com reenvios ou notificações simultâneas. Datas de atualização da API impedem que uma resposta antiga sobrescreva um estado mais recente. Não usamos uma janela curta de expiração para a assinatura, pois o provedor pode reenviar notificações atrasadas; replays continuam sujeitos à consulta autenticada e à idempotência.

Pagamentos recebidos antes de sua fatura aparecer na busca são mantidos com “Vínculo com assinatura pendente”; a notificação posterior da fatura ou o reenvio do pagamento confirma o vínculo sem criar outro pagamento. Faturas ainda sem pagamento são exibidas como faturas, sem inventar uma transação aprovada. A assinatura só aparece como Ativa quando a API retorna `authorized`; o pagamento possui status financeiro independente. Assinaturas de planos externos ao catálogo são ignoradas.

O endpoint responde `200` após persistir com sucesso ou reconhecer uma notificação duplicada/fora do escopo. Assinatura inválida recebe `401`; ausência de configuração, falha temporária do provedor ou do banco recebe erro, permitindo reenvio. A confirmação externa tem um limite total de 18 segundos. Nunca se retorna sucesso antes de uma gravação financeira necessária.

### Como testar sem cobrança real

1. Execute `node --test --test-isolation=none app/scripts/webhook.test.mjs app/scripts/payments.test.mjs` a partir da raiz do projeto. São utilizados banco em memória, assinaturas HMAC e respostas de API controladas, sem rede ou cobranças reais.
2. Em um ambiente de teste, configure o token e o Webhook Secret correspondentes. No painel Webhooks, use **Simular** com um ID de recurso de teste acessível àquela credencial. Confira a entrega e o histórico no admin. Um ID fictício sem recurso correspondente na API será recusado; assinatura inválida também não será aceita.
3. Reenvie a mesma notificação pelo painel e confirme que o pagamento não duplica. Para testar Ativa, Pausada, Cancelada, Pendente, aprovado e recusado, use os mocks locais ou somente recursos de teste do provedor.
4. Confira no painel de notificações do Mercado Pago as entregas com falha e reenvie após corrigir configuração ou indisponibilidade. O retorno do navegador em `/assinatura/retorno` não comprova pagamento.

O webhook atualiza o acompanhamento financeiro. Ele não concede acesso a serviços automaticamente, não cria cobranças e não altera ou cancela os três planos.

Documentação oficial de notificações e recursos:
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-content/notifications/webhooks
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-preapproval/get
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/authorized-payment-search/get
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-authorized-payment/get

Referências oficiais:
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval-plan/post
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/update-preapproval-plan/put
- https://www.mercadopago.com.br/developers/en/docs/subscription-plans/create-subscription-plan

Validação local, sem build: `node --test app/scripts/payments.test.mjs` a partir da raiz do projeto. Os testes usam banco em memória e respostas controladas, sem cobranças ou chamadas reais ao provedor.

## Checkout integrado Marquesano

A home e `/planos` agora levam diretamente a `/checkout/basico`, `/checkout/professional` e `/checkout/business`. Uma única página dinâmica mostra o contrato de 12 meses, as 12 cobranças mensais, os benefícios e o preço atual do PostgreSQL. Nenhum preço foi alterado por esta implementação.

Os códigos públicos preservam os vínculos existentes: `basico` → registro `basico`; `professional` → registro `intermediario`; `business` → registro `professional`. Os IDs do Mercado Pago não são renomeados nem recriados.

Configure `MERCADOPAGO_PUBLIC_KEY` e `MERCADOPAGO_ACCESS_TOKEN` da mesma aplicação/ambiente, além de `DATABASE_URL` e `ADMIN_SITE_ORIGIN`. Somente a Public Key é enviada ao navegador. Os planos devem estar ativos, sincronizados e com exatamente 12 ciclos. Planos sem essas condições continuam mostrando os dados e o CardForm; a contratação é recusada no submit até que estejam prontos.

O CardForm oficial do MercadoPago.js v2 usa `iframe: true`: número, validade e CVV ficam nos campos seguros do provedor. A página envia somente o token, e-mail, revisão do plano, identificador opaco da tentativa e aceite dos termos a `POST /api/checkout/{codigo}`. Nome/documento são usados pelo SDK, sem serem encaminhados ao backend Marquesano. Não há envio de preço, número do cartão ou CVV à API do site.

O backend verifica o plano remoto e cria a assinatura por `POST /preapproval` com `preapproval_plan_id`, `payer_email`, `card_token_id`, `external_reference` e `status=authorized`. A confirmação local em `/checkout/sucesso` depende de um recibo HttpOnly e de um registro autorizado no banco; parâmetros na URL não produzem confirmação. Autorizar a assinatura não equivale a marcar uma cobrança como paga: os webhooks existentes continuam responsáveis pelos pagamentos.

A migração 5 adiciona somente `checkout_attempts`, registrando aceite, valor contratado e estado da tentativa, sem armazenar tokens de cartão. Reserva transacional e índice único impedem repetição da mesma contratação. Após timeout, o botão **Verificar assinatura** consulta o recurso oficial pela referência externa, sem repetir o POST. Se o provedor continuar sem confirmar o resultado, o checkout mantém a tentativa pendente e orienta a procurar suporte; não simula sucesso.

Teste isolado, a partir de `app/`, com `ADMIN_PGLITE_MODULE` apontando para uma instalação local de PGlite: `node --test --test-isolation=none scripts/card-checkout.test.mjs scripts/card-checkout-ui.test.cjs scripts/plan-buttons.test.cjs scripts/payments.test.mjs scripts/webhook.test.mjs`. Os testes usam respostas simuladas da API e não cobram cartões. Antes de liberar vendas, valide também com as credenciais e cartões de teste oficiais do Mercado Pago (mesmo ambiente e conta vendedora dos planos).

Referências: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/cardtoken e https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post.

### Desenvolvimento local e recuperação do catálogo

Execute `npm run dev` na raiz. O comando usa `app/scripts/dev-local.mjs`: carrega o ambiente normal do Next.js e, somente em desenvolvimento, preenche variáveis de checkout ausentes a partir de `app/.env`. Valores já definidos têm prioridade. Nenhum segredo é impresso, e o ambiente de produção continua usando as variáveis injetadas pela hospedagem.

O catálogo público usa `server/checkout.mjs`, com o mesmo `DATABASE_URL`, schema, repository e migrações. Ele não depende do provisionamento de OWNER para ler os planos ou criar uma assinatura; o login administrativo permanece separado e inalterado.

A migração 6 repõe registros ausentes com `ON CONFLICT DO NOTHING`, preservando preços, estados e IDs já salvos. Ela não inventa valores pendentes. Para recuperar preços de um backup real do catálogo local: `node app/scripts/admin-restore-plans.mjs --sqlite app/.admin-data/admin.sqlite`. O SQLite é aberto somente para leitura e somente registros iniciais ainda não editados no PostgreSQL são atualizados. O script não importa nem altera usuários, sessões ou integrações.

A Public Key é passada por props do Server Component. O CardForm renderiza independentemente do estado ativo e do ID sincronizado, desde que existam preço real e Public Key. Apenas o backend decide se a contratação pode prosseguir. Os logs `CHECKOUT_LOCAL_PLAN` e `CHECKOUT_LOCAL_CARDFORM` mostram código público e booleanos, somente em desenvolvimento.

Para verificar visualmente as três páginas com Chrome/Edge instalado, sem preencher ou enviar cartão: `node app/scripts/checkout-visual-check.mjs`. Inicie o servidor na porta 3000 antes. O script bloqueia requisições de contratação e salva capturas desktop/mobile em uma pasta temporária. Os valores esperados no teste correspondem aos preços recuperados do backup local, não são defaults de cobrança.

## Public payment URLs

Configure `MERCADOPAGO_SITE_ORIGIN=https://marquesano.com.br` on the server (including Hostinger). This controls Mercado Pago back_url and the displayed webhook URL. It has no fallback to ADMIN_SITE_ORIGIN. Local checkout at http://localhost:3000 uses the same CSRF policy with an explicit development origin; production accepts only the two Marquesano HTTPS origins. Restart the local server after changing environment configuration.
