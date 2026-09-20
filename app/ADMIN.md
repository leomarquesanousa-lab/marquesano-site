# Marquesano Admin — operação

## Arquitetura preservada

Next.js 16.3.5, React 19.2.8, JavaScript e SQLite nativo no Node. Autenticação, usuários, sessões, scrypt, cookie HttpOnly, proxy, Origin e limites de login originais foram reutilizados. Nenhuma dependência nova nesta etapa. O banco é único, privado, em `ADMIN_DATABASE_PATH`.

O pedido recebido termina abruptamente no item 19, depois de “Dados / Contato / Or”. Foram implementados os requisitos completos recebidos e detalhes do cliente com dados, contato, origem e histórico relacionado. Nenhum requisito posterior foi presumido.

## Instalação e migrations

Use Node 24 LTS e volume local persistente em um único servidor Node. Não usar disco efêmero/serverless ou bancos locais independentes em vários hosts. O banco não pode ficar em `public` (configuração recusada). Proteja banco e backups com ACL do usuário do serviço no Windows ou permissões restritas no Linux.

Configuração privada na raiz, junto ao `package.json`, ou no ambiente da hospedagem:

```dotenv
ADMIN_DATABASE_PATH=C:/tech/site-assinatura-starter/app/.admin-data/admin.sqlite
ADMIN_SITE_ORIGIN=http://localhost:3000
```

Em produção: `ADMIN_SITE_ORIGIN=https://marquesano.com.br`, HTTPS e um caminho absoluto privado, por exemplo `/var/lib/marquesano/admin.sqlite`. As variáveis de contato/Resend permanecem inalteradas. Não usar `NEXT_PUBLIC_` para credenciais.

Antes de publicar/reiniciar, na raiz:

```powershell
node app/scripts/admin-migrate.mjs
npm run build
npm run start
```

O script faz backup consistente com a API SQLite, incluindo WAL, no mesmo diretório privado com sufixo de data/hora. Depois aplica migrations. Se a configuração não existir, recusa executar. Para restaurar, pare o Node e use um backup consistente com a versão de código; não sobrescreva um banco aberto.

`server/admin/migrations.mjs` registra `schema_migrations`, usa transação, índices, foreign keys e WAL. A migration 1 adiciona visitors, utm_attribution, leads, companies, clients, form_submissions, lead_notes, lead_status_history, marketing_events, campaigns, settings, audit_log e public_limits. Preserva usuários e sessões. Migrations também rodam idempotentemente na abertura do banco. Nunca apagar o banco para atualizar schema.

O SQL operacional fica em `repository.mjs`; componentes não executam SQL. Para migrar futuramente a PostgreSQL, preservar o contrato do repositório e adaptar SQL/migrations. Nenhum segundo banco foi criado.

Instalação nova, somente quando não houver usuário:

```powershell
node app/scripts/admin-owner.mjs
```

O comando pede e-mail e senha oculta no terminal e cria o primeiro OWNER. Não recria usuários existentes. Contas adicionais e mudanças de senha/role ficam em `/admin/usuarios`. Não existe cadastro ou recuperação pública de senha.

## Permissões

| Role | Módulos |
| --- | --- |
| OWNER | Todos, inclusive usuários |
| ADMIN | Dashboard, marketing, analytics, leads, clientes, SEO, formulários, campanhas, configurações e auditoria |
| MARKETING | Dashboard, marketing, analytics, SEO e campanhas |
| SALES | Dashboard, leads, clientes e formulários |
| VIEWER | Dashboard e analytics, somente leitura |

APIs revalidam sessão, role, Origin e entrada, independentemente do proxy/menu. Usuários reutilizam a tabela original; edição de acesso/senha revoga sessões. O último OWNER ativo não pode ser desativado ou rebaixado. Nunca são retornados hashes, senhas ou chaves. Não há exclusão permanente comum de leads/clientes; use arquivar/restaurar pelo status.

Sessões: oito horas, token aleatório de 32 bytes, somente SHA-256 no banco, cookie HttpOnly/SameSite=Strict/Secure e prefixo `__Host-` em produção. Login mantém 5 tentativas por e-mail e 100 globais por 15 minutos. Alterações, notas, conversões, usuários, configurações, login e logout são auditados sem copiar segredos ou conteúdo das notas para o log. As rotas administrativas continuam noindex/nofollow e sem links públicos.

## Módulos

- Dashboard: leads novos/em acompanhamento/ganhos, formulários, clientes/campanhas ativos, visitantes, origens, páginas e tendência, somente dados registrados.
- Leads: cadastro, busca, filtros, ordenação, paginação, edição, responsável, prioridade, notas, histórico, arquivamento/restauração.
- Clientes: contatos, empresa, site, documento opcional, notas e status; conversão idempotente de lead WON, com vínculo e histórico original.
- Formulários: submissões e notificação PENDING/SENT/FAILED/UNKNOWN. UNKNOWN indica resposta inconclusiva do provedor, sem presumir entrega.
- Campanhas: dados, estados, datas, canal, source/medium/slug, destino interno, URL UTM e cópia; visitas atribuídas, leads e ganhos. Sem ROI inventado.
- Marketing: agrupamentos reais por origem, campanha e medium, páginas e tendências.
- SEO, Analytics, Configurações, Usuários e Auditoria: telas operacionais e integrações descritas abaixo.

Períodos são UTC, hoje/7/30/90 dias ou datas personalizadas, até 366 dias por consulta. Ganhos/recebidos usa a coorte de leads criados no período. Clientes/campanhas ativos são totais atuais, identificados na interface. Sem denominador, taxas exibem “—”. Visitantes representam IDs aleatórios de navegador, não pessoas comprovadas. Contagem local e GA4 não são somadas.

## Contato e Resend

Mantidos: validação server-side, body limit, honeypot, token assinado, expiração, tempo mínimo, Origin e rate limit. Após validação, uma transação salva submissão/lead; o mesmo handler envia pelo Resend e registra o estado. Sucesso não é simulado quando e-mail falha.

Token e campos determinam a idempotência: a mesma requisição não duplica submissão ou e-mail já confirmado. Para associar uma nova mensagem ao mesmo lead, nome normalizado + e-mail normalizado + telefone precisam coincidir. E-mail ou telefone isolados não fundem pessoas. Mensagens permanecem em submissões separadas. Leads arquivados não reabrem silenciosamente.

Antes de configurar o admin, o e-mail continua funcionando sem CRM. Com banco configurado, falha de persistência retorna 503; falha do provedor mantém o registro e retorna erro. Não há worker automático de reenvio: a repetição válida mantém idempotência. PENDING/UNKNOWN não significam entregue.

## Tracking e atribuição

Desligados por padrão. Ative em Configurações quando quiser iniciar. `/api/marketing` só expõe habilitação e IDs públicos, nunca credenciais. POST valida Origin, eventos, tamanho e limites persistentes de 120 eventos/visitante/minuto e 3.000 totais/minuto.

Visitor ID aleatório em cookie HttpOnly, SameSite=Lax, Secure em produção, 90 dias. Sem fingerprint, IP ou user-agent persistidos. São armazenados UTMs limitados, caminho sem query, origem do referrer sem caminho/query e horário. Primeiro toque preservado; último toque atualizado em atribuição de campanha/referrer externo. Sem cookie, o formulário captura apenas a atribuição disponível na página atual.

Eventos: page_view, cta_click, whatsapp_click, phone_click, email_click, contact_form_start, contact_form_submit, plan_view, portfolio_view, service_view. lead_generated é registrado pelo servidor ao receber submissão e enviado ao Google após confirmação do formulário. Não são enviados ao Google nome, e-mail, telefone ou mensagem. Não roda no admin, com DNT/GPC ou nos formulários demonstrativos.

Bloqueadores, limpeza de cookies, robôs e falhas de rede podem alterar a contagem local. Dados persistem no banco: estabeleça retenção e backup adequados à operação. Não há gerenciador de consentimento neste projeto; se necessário à operação, mantenha a coleta desativada até integrar a escolha do visitante.

## Google: configuração

IDs não secretos podem ser salvos no painel; valores salvos prevalecem sobre env. Exemplo em `config/marketing.env.example`:

```dotenv
TRACKING_ENABLED=false
GTM_CONTAINER_ID=
GA4_MEASUREMENT_ID=
GA4_PROPERTY_ID=
GSC_SITE_URL=sc-domain:marquesano.com.br
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

As duas últimas variáveis são **somente do servidor**, nunca da UI. Use conta de serviço Google Cloud, habilite Analytics Data API/Search Console API e dê à conta acesso de leitura nas propriedades. A chave aceita PEM com quebras reais ou `\n`. Reinicie após alterar env.

GTM/GA4 só carregam com coleta habilitada e ID válido. Com GTM, não é carregada tag GA4 direta. Sem GTM, GA4 recebe eventos explícitos com `send_page_view:false`. `next/script` carrega após interatividade. Não há iframe noscript: a coleta depende de JavaScript e do controle DNT/GPC; visitantes sem JS continuam usando o portal.

No Google, publicar contêiner e configurar gatilhos de eventos personalizados no dataLayer. Evitar segundo page_view automático, inclusive medição aprimorada de histórico se houver navegação SPA. Marcar lead_generated como evento principal no GA4 quando apropriado. “Configurado” não significa contêiner publicado ou tracking validado pelo Google.

APIs oficiais:

- GA4: Property ID numérico, `properties/<id>:runReport`, usuários, sessões, page views, eventos principais, source/medium/campaign, páginas, dispositivos, países e eventos.
- Search Console: propriedade `sc-domain:marquesano.com.br` ou URL exata `https://marquesano.com.br/`, `searchAnalytics/query`, cliques, impressões, CTR, posição, consultas, páginas, países e dispositivos.
- Estados: Não configurado, Configurado, Ativo após resposta válida, Erro de autenticação ou Erro de conexão. Tabelas limitadas a 100 linhas; Search Console retorna os principais resultados. Não há scraping nem dados substitutos fictícios.

## SEO

Metadata, canonicals individuais, Open Graph, Twitter, preview e ícones existentes preservados. JSON-LD: Organization, WebSite, WebPage, BreadcrumbList e Service somente na página de serviços. Nenhum Article, endereço físico ou review inventado.

Robots bloqueia `/admin` e `/api`; sitemap descobre páginas estáticas públicas na árvore app, exclui admin/API/dinâmicas e respeita `index:false` explícito no arquivo da página. Para rotas dinâmicas futuras, acrescentar slugs indexáveis ao provedor. A implantação atual precisa manter a árvore de fontes; standalone deve incluir manifesto gerado no build.

SEO audita o HTML do último build (title, description, canonical, H1, alt, JSON-LD). Sem build, identifica leitura de configuração fonte. O botão de diagnóstico publicado consulta robots/sitemap apenas no domínio oficial com timeout: pode apontar ausência antes do deploy. Não aceita URLs arbitrárias. Manifest não foi adicionado porque o portal não é uma PWA instalável; favicon/Apple Touch existentes permanecem.

## Verificação

```powershell
node --test --test-isolation=none app/scripts/admin.test.mjs app/scripts/operations.test.mjs app/scripts/contact.test.mjs app/scripts/contact-session.test.mjs app/scripts/availability.test.mjs
npm run build
node app/scripts/verify-admin.mjs
```

Teste integrado: banco temporário, porta 3197, autenticação, roles, CSRF, último OWNER, CRM, campanhas, atribuição, logout, páginas públicas, metadata, imagens, robots/sitemap. Testes de formulário simulam Resend, sem e-mail real. Testes Google usam respostas controladas. Não há lint configurado. Não houve navegador conectado para inspeção visual desktop/mobile. Nenhum deploy automático.

Nesta implementação, 31 testes passaram. O banco local configurado recebeu backup consistente e migration, sem substituir usuários/sessões. Credenciais Google ausentes: conexão real com GA4/Search Console ainda depende de configuração. A lista de arquivos abaixo descreve esta evolução; alterações da fundação do admin já existentes no workspace foram preservadas.

## Arquivos desta evolução

- `server/admin/`: core.mjs, migrations.mjs, repository.mjs, validation.mjs, operations.mjs, api.mjs, google.mjs.
- `admin/`: [[...path]]/page.js, operations.js, admin.module.css.
- Contato/tracking: server/contact.mjs, server/marketing.mjs, api/contato/route.js, api/marketing/route.js, components/contact-session.mjs, components/tracking.mjs, components/PublicTracking.js, layout.js.
- SEO: server/seo.mjs, robots.js, sitemap.js, components/StructuredData.js; page.js da home, serviços, portfólio, planos, sobre, contato e seis páginas de exemplos (incluindo menu).
- Operação: .gitignore, config/marketing.env.example, scripts/admin-migrate.mjs, scripts/operations.test.mjs, scripts/verify-admin.mjs, ADMIN.md.

Referências: [GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart), [Search Console](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [conta de serviço](https://developers.google.com/identity/protocols/oauth2/service-account), [page views](https://developers.google.com/analytics/devguides/collection/ga4/views), [SQLite](https://nodejs.org/api/sqlite.html).
