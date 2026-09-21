# Persistência administrativa PostgreSQL

O runtime usa exclusivamente `DATABASE_URL` e o driver `pg`. Não usa arquivo local,
`node:sqlite` ou `ADMIN_DATABASE_PATH`. Scrypt, roles, cookies, sessões e contratos
das integrações permanecem iguais; os acessos ao banco agora são assíncronos.

## Configuração local e Hostinger

Configure no ambiente do processo Next.js:

```dotenv
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/BANCO?sslmode=verify-full
ADMIN_SITE_ORIGIN=https://marquesano.com.br
ADMIN_INITIAL_OWNER_EMAIL=seu-email
ADMIN_INITIAL_OWNER_PASSWORD_HASH=scrypt$...
```

Use a URL fornecida pelo serviço PostgreSQL e as opções TLS/CA exigidas por ele.
Não desative a validação do certificado. Senhas com caracteres reservados precisam
estar codificadas na URL. Não use `NEXT_PUBLIC_`. Para PostgreSQL local sem TLS,
use a URL local apropriada. O endereço precisa ser acessível pelo servidor Hostinger;
o deploy GitHub não cria um serviço PostgreSQL automaticamente.

Instale as dependências do lockfile com `npm ci` no fluxo normal de deploy. A única
dependência nova de runtime é `pg` (sem ORM). Não é necessário configurar um caminho SQLite.

## Dados existentes: importar antes de iniciar a nova aplicação

1. Interrompa escritas na aplicação antiga e preserve o SQLite e eventuais arquivos WAL.
2. Aponte `DATABASE_URL` para um banco/schema PostgreSQL vazio, ainda não aberto pela nova aplicação.
3. Em uma máquina com acesso ao SQLite e ao PostgreSQL, execute na raiz do projeto:

```text
node app/scripts/admin-import-sqlite.mjs --sqlite CAMINHO_DO_BACKUP_SQLITE
```

O importador abre o SQLite em modo somente leitura, exige schema versão 4 e executa
toda a importação em uma transação PostgreSQL. Recusa qualquer destino já inicializado.
Preserva IDs, hashes scrypt, sessões, plano/preço/ciclos, IDs Mercado Pago, ciphertext
da Meta, histórico e eventos. Compara as contagens de todas as tabelas antes do commit.
Falhas revertem o destino. Não apaga nem regrava o arquivo de origem.
Use uma cópia consistente do SQLite: não copie apenas o arquivo principal enquanto
há escritas ativas em WAL. Conserve também as variáveis/chaves de criptografia da Meta.

Para uma instalação nova, sem importação:

```text
node app/scripts/admin-migrate.mjs
```

As migrações também rodam automaticamente na abertura do store, com transação e lock
consultivo entre instâncias. O registro `schema_migrations` impede execução repetida.
O pool mantém cada transação na mesma conexão; uma Promise compartilhada evita
inicializações concorrentes no mesmo processo. Timestamps em milissegundos usam BIGINT.

## OWNER

Gere o hash localmente, sem senha em variável de ambiente:

```text
node app/scripts/admin-password-hash.mjs
```

Configure as duas variáveis `ADMIN_INITIAL_OWNER_*` no painel Hostinger. O startup
administrativo provisiona o e-mail se não existir, mesmo com outros usuários presentes.
Um e-mail existente nunca é alterado. Depois de confirmar o login, remova as duas
variáveis. Inicialização e login compartilham o mesmo pool e a mesma `DATABASE_URL`.

## Diagnóstico e testes

```text
node app/scripts/admin-postgres-check.mjs
```

O diagnóstico valida conexão pelo driver `pg`, migrações, OWNER, login, sessão,
planos, persistência de pagamentos e deduplicação de eventos de webhook. Usa um schema
temporário próprio, removido no fim; exige permissão de criar schemas. Não cria cobrança
nem chama APIs financeiras. Não provisiona um usuário real no schema da aplicação.

Para os testes automatizados isolados, instale `@electric-sql/pglite` em um diretório
de ferramentas separado e configure `ADMIN_PGLITE_MODULE` com o caminho absoluto do
arquivo `dist/index.js`. PGlite executa PostgreSQL em WASM, sem tocar em dados reais.

```text
node --test --test-isolation=none app/scripts/postgres.test.mjs app/scripts/postgres-import.test.mjs app/scripts/admin-provision.test.mjs app/scripts/admin.test.mjs app/scripts/operations.test.mjs app/scripts/payments.test.mjs app/scripts/meta.test.mjs app/scripts/webhook.test.mjs app/scripts/direct-checkout.test.mjs
```

O teste WASM não comprova conectividade TCP/TLS da hospedagem: execute também o diagnóstico
com `DATABASE_URL` no ambiente pretendido antes de liberar produção.

## Tabelas preservadas

`users`, `sessions`, `login_limits`, `companies`, `visitors`, `utm_attribution`,
`leads`, `form_submissions`, `lead_notes`, `lead_status_history`, `clients`,
`campaigns`, `marketing_events`, `settings`, `audit_log`, `public_limits`,
`meta_connection`, `meta_oauth_states`, `subscription_plans`, `mp_subscriptions`,
`mp_invoices`, `mp_payments`, `mp_webhook_events`, `schema_migrations`.

SQLite permanece apenas no importador explícito e no backup legado. Nunca ocorre
fallback automático para SQLite quando PostgreSQL está indisponível.

## Arquivos desta migracao

- app/ADMIN.md
- app/admin/PAYMENTS.md
- app/api/assinaturas/[plan]/route.js
- app/api/checkout/[plan]/route.js
- app/assinar/[plan]/page.js
- app/components/Commercial.js
- app/components/PlanCards.js
- app/config/admin.env.example
- app/config/mercadopago.env.example
- app/page.js
- app/POSTGRES.md
- app/scripts/admin.test.mjs
- app/scripts/admin-import-sqlite.mjs
- app/scripts/admin-migrate.mjs
- app/scripts/admin-owner.mjs
- app/scripts/admin-postgres-check.mjs
- app/scripts/admin-provision.test.mjs
- app/scripts/direct-checkout.test.mjs
- app/scripts/integrations.test.mjs
- app/scripts/meta.test.mjs
- app/scripts/operations.test.mjs
- app/scripts/payments.test.mjs
- app/scripts/plan-buttons.test.cjs
- app/scripts/postgres.test.mjs
- app/scripts/postgres-import.test.mjs
- app/scripts/postgres-test-store.mjs
- app/scripts/verify-admin.mjs
- app/scripts/webhook.test.mjs
- app/server/admin/api.mjs
- app/server/admin/billing-store.mjs
- app/server/admin/core.mjs
- app/server/admin/direct-checkout.mjs
- app/server/admin/import-data.mjs
- app/server/admin/mercadopago.mjs
- app/server/admin/mercadopago-webhook.mjs
- app/server/admin/meta.mjs
- app/server/admin/meta-api.mjs
- app/server/admin/meta-store.mjs
- app/server/admin/migrations.mjs
- app/server/admin/operations.mjs
- app/server/admin/payment-api.mjs
- app/server/admin/plan-store.mjs
- app/server/admin/postgres.mjs
- app/server/admin/repository.mjs
- app/server/admin/session.js
- app/server/admin/tables.mjs
- app/server/marketing.mjs
- app/server/plans.js
- package.json
- package-lock.json
- proxy.js
