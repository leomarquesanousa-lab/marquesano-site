# Meta Ads — Marquesano

## Auditoria da integração reutilizada

- OAuth: `server/admin/meta-api.mjs`, por `/api/admin/meta/connect` e `/callback`.
- Token: `meta_connection.token_ciphertext`, AES-256-GCM em `meta.mjs`. Não há segunda cópia do token.
- Conta selecionada: `meta_connection.account_json`. Toda operação confirma acesso à conta na Graph API.
- Proteção OAuth: `meta_oauth_states`, state de uso único vinculado à sessão e cookie de navegador.
- Configurações existentes: `admin/settings-integrations.js`; conexão, seleção de conta e leitura existentes preservadas.
- Antes: somente `ads_read`, campanhas/insights. Agora: o mesmo cliente suporta conjuntos, anúncios, criativos, imagens e alterações confirmadas.
- Banco: adaptador PostgreSQL existente, mesmas transações/advisory lock, sem SQLite ou ORM novo.

## Arquivos

Criados:

- `admin/meta-ads-section.js`: módulo, wizard, assistente, biblioteca, conversões, histórico e confirmação.
- `server/admin/meta-ads-service.mjs`: catálogo de campos, validação, métricas, propriedade dos recursos e execução.
- `server/admin/meta-ads-api.mjs`: handlers protegidos, rascunhos, imagens, confirmações e sincronização.
- `server/admin/meta-ads-store.mjs`: persistência, deduplicação e migration 9.
- `server/admin/meta-ads-ai.mjs`: providers opcionais de planejamento e imagens.
- `scripts/meta-ads.test.mjs`, `scripts/meta-ads-ui.test.cjs`: testes isolados.
- `scripts/meta-ads-ui-render.cjs`, `scripts/meta-ads-visual-check.mjs`: fixtures e verificação visual em 390/1280 px, com rede externa bloqueada.

Ampliados: `meta.mjs`, `meta-api.mjs`, `api.mjs`, `core.mjs`, `repository.mjs`, `migrations.mjs`, `admin/[[...path]]/page.js`, `config/meta.env.example`. O teste de contagem de migrations em `operations.test.mjs` passa a considerar a versão 9.

## Navegação

`/admin/meta-ads`, `/campanhas`, `/campanhas/{id}`, `/conjuntos`, `/anuncios`, `/nova`, `/assistente`, `/criativos`, `/conversoes`, `/historico`.

O dashboard consulta métricas reais e preserva indisponibilidade como `null`. Ações/conversões são exibidas separadas por tipo, sem somar resultados que podem representar a mesma conversão. Os rankings usam cliques, explicitamente identificados; não prometem que mais cliques significam melhor retorno. Insights normalizados conservam também os campos brutos selecionados.

Os períodos usam os presets oficiais da conta, incluindo hoje/ontem. Período personalizado limitado a 366 dias. Paginação do cliente segue cursores, nunca URLs externas, até 2.000 itens por consulta. Truncamento é sinalizado; não se apresentam totais parciais como definitivos.

## Variáveis

Existentes e obrigatórias: `DATABASE_URL`, `ADMIN_SITE_ORIGIN`, `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`.

`META_TOKEN_ENCRYPTION_KEY` continua opcional. Preserve o valor já usado; mudá-lo exige reconexão.

Novas opcionais:

- `META_GRAPH_API_VERSION`: padrão `v26.0`, a versão que o projeto já usava. OAuth, troca de token e Graph compartilham a configuração.
- `OPENAI_API_KEY`: somente no servidor.
- `OPENAI_META_ADS_MODEL`: modelo habilitado na sua conta para Responses API. Sem chave/modelo, assistente indisponível.
- `OPENAI_IMAGE_PROVIDER=openai` e `OPENAI_IMAGE_MODEL`: habilitam o provider de imagens compatível com `b64_json` e tamanhos GPT Image. Nenhuma chamada é feita no startup ou migrations.

Nenhuma credencial foi criada, substituída ou colocada no exemplo de configuração. Não usar prefixo `NEXT_PUBLIC_` nas chaves.

## OAuth e permissões

Conexão de leitura existente continua solicitando `ads_read`. O link explícito `/api/admin/meta/connect?manage=1` permite reconectar pelo mesmo OAuth e solicitar:

- `ads_read`: relatórios.
- `ads_management`: criação/edição/upload.
- `pages_show_list`, `pages_read_engagement`, `pages_manage_ads`: seleção e uso de identidade de Página para criativos.

`business_management` não foi adicionado: o módulo usa a conta selecionada e não administra Business Managers. A disponibilidade real depende da concessão, das tarefas do usuário na conta/Página, do modo do aplicativo e da aprovação exigida pela Meta. O painel verifica `/me/permissions`, não presume gerenciamento a partir da existência do token.

Uma conexão existente com leitura continua útil. Escritas ficam bloqueadas até `ads_management` ser efetivamente concedida. A reconexão mantém os mecanismos de state/sessão existentes; após reconectar pode ser necessário selecionar a conta novamente, conforme o fluxo já existente.

## Endpoints

Todos sob `/api/admin/meta-ads`, com sessão OWNER/ADMIN. Mutação exige o helper `validAdminRequestOrigin`, também usado no admin. Nenhum token vai ao browser.

| Método | Caminho | Função |
| --- | --- | --- |
| GET | `/status` | Conta, permissões, validade e disponibilidade de IA |
| GET | `/report?period=30` | Campanhas, conjuntos, anúncios e insights |
| POST | `/sync?period=30` | Consulta Meta e salva snapshot local; somente GETs na Meta |
| GET | `/assets` | Páginas, pixels, públicos salvos, conversões e estrutura existente |
| GET | `/locations?q=...` | Busca oficial de cidades/regiões para segmentação |
| GET | `/events?pixel={id}` | Estatísticas de eventos de pixel pertencente à conta |
| GET/POST | `/drafts` | Listagem/criação de rascunho local |
| GET | `/images` | Biblioteca de imagens da conta |
| POST | `/upload` | PNG/JPEG base64 limitado a 5 MB, upload backend → Meta |
| GET | `/history` | Histórico de propostas e resultados |
| POST | `/prepare` | Valida proposta e emite confirmação temporária |
| POST | `/execute` | Consome confirmação vinculada ao usuário/conta e executa |
| POST | `/assistant` | Gera planejamento e salva rascunho local |
| POST | `/generate-image` | Gera imagem opcional após confirmação de uso do provider |

Propostas: `create`, `status`, `edit`, `duplicate`. Tipos: `campaigns`, `adsets`, `ads`. O servidor limita campos e verifica `account_id`; não é um proxy Graph arbitrário.

Wizard cria campanha, conjunto, criativo e anúncio sequencialmente. Pode reutilizar campanha/conjunto selecionado ou criar apenas o criativo. Os novos objetos de entrega recebem `PAUSED`; duplicação usa `status_option=PAUSED`. Não existe ativação automática após criação, upload, sincronização ou planejamento.

## Segurança e confirmação

Proposta armazena valor anterior/novo, conta e autor. A confirmação aleatória é entregue ao browser, mas somente seu hash é persistido. Ela expira em dez minutos e só pode ser consumida uma vez, sob transação. Não é token Meta nem credencial de bootstrap.

O modal mostra as alterações antes de executar. A confirmação não pode ser reutilizada por outro usuário/conta. Mudanças no recurso ou revisão da conexão invalidam a execução. Ativar, pausar, orçamento, lance, datas, segmentação, edição e duplicação seguem o mesmo protocolo humano.

Cada etapa de uma criação mantém IDs parciais no histórico. Falha ou timeout leva a `UNKNOWN`; não há retry automático de POST. O operador deve sincronizar e conferir o resultado na Meta antes de iniciar outra proposta. Esse cuidado evita prometer idempotência que a Graph API não fornece para todas as operações. Fechar o navegador não desfaz uma chamada já recebida pela Meta.

Leituras não alteram recursos Meta. Upload deduplica por SHA-256 e conta. Upload sem confirmação fica `PROCESSING`, bloqueando nova tentativa com o mesmo conteúdo até conferência manual. Nunca persistir o corpo binário em logs. PNG/JPEG possuem limite e verificação de assinatura; SVG/HTML recusados.

Erros retornam mensagens amigáveis. Logs Meta contêm HTTP status, código/subcódigo numéricos e request ID validado; não registram textos arbitrários, tokens, URLs com credenciais ou app secret. Respostas do cliente removem campos de credenciais e valores sensíveis conhecidos.

## Tabelas e migration 9

- `meta_campaign_drafts`: formulário ou planejamento IA local, conta, autor e datas.
- `meta_creatives`: nome, formato, origem, hash, URL da imagem Meta, prompt quando informado, campanha e estado.
- `meta_campaign_snapshots`: última sincronização por conta, incluindo insights brutos selecionados.
- `meta_action_log`: propostas, antes/depois, autor, resultado, IDs parciais e request ID quando disponível.

Reutiliza `meta_connection`, `meta_oauth_states`, `users` e `audit_log`. Planejamentos IA ficam nos rascunhos, insights no snapshot: não foram criadas tabelas redundantes só para separar esses conteúdos.

Migration 9 é transacional e controlada por `schema_migrations`. Não remove nem modifica dados de outras tabelas. Executada pelo startup normal antes de disponibilizar o repository. Nenhuma chamada Meta, IA ou envio de e-mail ocorre na migration.

## Assistente e criativos

O assistente é um planejador acionado pelo operador, não um agente autônomo/agendado. Usa Responses API com `store:false`, sem ferramentas de execução. Briefing não inclui token, banco, dados pessoais da conta nem métricas privadas. Retorna estratégia, sugestões e testes A/B como texto para revisão. Regenerações recebem o planejamento anterior e a seção escolhida; cada resposta salva um novo rascunho.

O preset Marquesano oferece “Site profissional a partir de R$ 99/mês”, destino do site e ideias de peças. Não define automaticamente objetivo, orçamento, pixel ou público. O operador transfere as sugestões aprovadas para os campos do wizard antes da criação.

Imagens manuais ou existentes em storage podem ser baixadas e enviadas pela biblioteca; não há fetch arbitrário de URLs pelo servidor. Metadados distinguem upload e IA. Imagem IA não é enviada automaticamente à Meta: o operador revê e escolhe enviar. Formatos manuais: quadrado, vertical 9:16 e horizontal. O provider GPT Image fornece uma fonte vertical 2:3; a interface informa a necessidade de recorte para 9:16. Nenhum redimensionamento oculto ou promessa de 9:16 nativo.

## Dependências externas e limites

- Acesso gerencial à conta, Página apta a anunciar, permissões e eventuais revisões do App são externos ao código.
- WhatsApp exige Página/número vinculados e habilitados; o wizard valida objetivo, CTA e destino oficial, mas não provisiona WhatsApp Business.
- Leads instantâneos exigem ID de formulário Meta aprovado informado pelo operador. Este módulo não cria formulários Meta.
- Conversões exigem pixel/dataset e evento reais. Estatísticas vazias não são interpretadas como eventos configurados. Categorias especiais podem limitar segmentação e exigir aprovações adicionais; a Meta continua sendo a autoridade final.
- Criativos implementados são de imagem/link. Vídeos, catálogos de produtos, carrosséis, anúncios políticos com disclaimers e todos os recursos avançados do Ads Manager não são cobertos.
- Edição de anúncio permite nome e substituição de criativo. Para mudar texto, crie um novo criativo e selecione seu ID; criativos existentes não são mutados silenciosamente.
- Insights grandes usam consultas síncronas limitadas e exibem truncamento; contas com volume superior precisam de relatórios assíncronos/paginação adicional.
- IA depende de chave/modelos habilitados e cobrança do provider. Não houve geração paga nem qualquer alteração em anúncios reais durante a implementação.

## Deploy e teste

Execute os testes com `ADMIN_PGLITE_MODULE` apontando para a instalação isolada de PGlite já utilizada no projeto. `meta-ads.test.mjs` usa transporte Meta/IA simulado; `meta-ads-ui.test.cjs` renderiza fixtures sem rede. Rode também regressão de OAuth, usuários, integrações, checkout, vendas e webhook.

O build não deve iniciar workers ou chamar APIs. Configure as variáveis existentes no ambiente de produção, preserve a chave de cifragem, publique pelo fluxo normal e deixe migration 9 executar. Este trabalho não executa deploy nem aplica a migration no Neon real.

Troubleshooting: sem conta, use Configurações → Meta; sem gerenciamento, reconecte pelo link do módulo; token expirado exige reconexão; `UNKNOWN` exige conferência dos IDs no histórico; imagem `PROCESSING` exige conferir biblioteca Meta. Nunca repetir operações financeiras automaticamente com base apenas em timeout.

## Referências oficiais consultadas

- [SDK oficial Meta — Campaign](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/campaign.py): campos editáveis e cópias pausadas.
- [SDK oficial Meta — Ad Account](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adaccount.py): criação de recursos e imagens.
- [SDK oficial Meta — Ad Set](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adset.py): segmentação, otimização e destino.
- [OpenAI — geração de texto](https://developers.openai.com/api/docs/guides/text): Responses API e conteúdo textual.
- [OpenAI — geração de imagens](https://developers.openai.com/api/docs/guides/image-generation): provider e tamanhos de imagem.

As páginas de referência direta em developers.facebook.com retornaram HTTP 429 durante a consulta; o SDK oficial publicado pela Meta foi usado para conferir os parâmetros.

## Resultado da implementação local

Regressão completa: 208 testes aprovados. Após a busca de localidades e ajustes finais, 42 testes Meta/OAuth/interface aprovados, incluindo um teste novo (209 testes distintos no conjunto). Verificação visual: 14 cenários em Chrome headless, 390 e 1280 px, sem transbordamento horizontal. Build Next.js 16.3.5 aprovado com credenciais removidas somente do subprocesso. Nenhuma migração no Neon real, chamada paga de IA, alteração de campanha, commit, push ou deploy.
