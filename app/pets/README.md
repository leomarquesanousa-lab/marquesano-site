# Pets integrado à Marquesano

Home principal: / . Portal e subrotas: /pets . Administração: /admin/pets .

Banco: adapter e pool existentes de server/admin/core.mjs, com DATABASE_URL. Sem conexão ou SQLite próprio. Migrations 001, 002 e 003 transacionais e idempotentes, aplicadas exclusivamente pelo comando node app/scripts/pets-migrate.mjs antes de iniciar/publicar o portal. db() e renderizações não executam migrations. O helper oficial adminDatabase() fornece o adapter compartilhado.

Admin global: users e sessions Marquesano, por server/admin/session.js. Login em /admin/login, gestão em /admin/usuarios. OWNER e ADMIN gerenciam todos os anúncios em /admin/pets, mantendo as permissões dos demais módulos. /administracao somente redireciona.

Usuários públicos: pet_public_users, sem campo de role administrativo, e pet_public_sessions, no mesmo banco/pool PostgreSQL. Rotas /pets/cadastro, /pets/login, /pets/minha-conta e /pets/meus-anuncios. Cookie público independente de marquesano_admin; uma sessão pública nunca é consultada pela autenticação administrativa. Caso existam ambas as sessões, a sessão administrativa tem prioridade no portal.

Propriedade: anúncios públicos usam public_user_id com FK para pet_public_users. Os anúncios administrativos existentes preservam user_id com FK para users. CHECK exige exatamente um dono por anúncio; edição não muda o dono. O backend obtém a identidade pela sessão e verifica ownsPet/isPetAdmin antes de editar, excluir ou marcar resolvido. Minha conta filtra por identidade e tipo de usuário. Campos de dono enviados no formulário não definem a propriedade.

Novos anúncios são publicados imediatamente. Edições preservam anúncios ocultados pelo admin. Admin pode editar, ocultar, exibir, excluir e marcar resolvido.

Configure R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no servidor, com dados reais do bucket Marquesano e permissão de leitura/escrita de objetos. A camada S3 usa região auto e prefixos pets/ads/ e pets/users/. Nenhum bucket é criado. Uploads ficam bloqueados enquanto faltar configuração. Novas fotos vão em binário ao R2; o banco guarda storage_key. A API lê objetos privados, mantendo autorização. Fotos legadas continuam em data base64, sem conversão ou exclusão automática.

Se já houver tabelas Pets no PostgreSQL, a migration vincula responsáveis pelo e-mail a contas Marquesano existentes; responsáveis sem correspondência fazem a migration abortar integralmente. Tabelas pet_users e pet_sessions legadas são preservadas, mas não usadas. A importação não destrutiva usa node app/scripts/pets-import-legacy.mjs [caminho-opcional], vincula responsáveis pelo e-mail e mantém o SQLite intacto. O legado local (um anúncio e uma foto) foi importado. Nenhum usuário ou sessão de Pets é importado.

Validação: node app/scripts/pets-integration.test.mjs. Os comandos de teste anteriores também executam essa suíte de integração.

Referência: https://developers.cloudflare.com/r2/api/s3/api/
