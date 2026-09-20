# Integrações administrativas

## Google

GA4 mantém a autenticação JWT da Service Account, com cache separado por escopo.
Os relatórios acrescentam série diária, novos usuários, eventos e taxa de sessões
com evento principal. Dashboard e Analytics consultam dados reais ao abrir.

Search Console usa `https://www.googleapis.com/auth/webmasters.readonly` e
`POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`.
A propriedade de domínio é codificada como `sc-domain%3Amarquesano.com.br`.

Diagnósticos públicos usam somente códigos/mensagens permitidos. Nenhuma mensagem
bruta do provedor é encaminhada. Em erro de permissão, uma consulta `sites.list`
ajuda a identificar domínio versus propriedade de URL. Uma propriedade que não
aparece na lista pode estar ausente ou sem permissão; isso não prova inexistência.

Verificação real nesta revisão: Google retornou `API_DISABLED`. Habilitar
**Google Search Console API** no projeto da Service Account, depois testar em
Configurações. O acesso à propriedade só poderá ser confirmado após a ativação.
O código não altera permissões nem habilita serviços no Google Cloud.

Referências:
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/sites/list
- https://developers.google.com/webmaster-tools/v1/errors
- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema

## Meta Marketing API — OAuth e leitura

Configurar no `.env` da raiz (junto ao package.json), ou na hospedagem:

```dotenv
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://marquesano.com.br/api/admin/meta/callback
```

A origem de `META_REDIRECT_URI` deve ser igual a `ADMIN_SITE_ORIGIN`.
O ambiente local atual usa `http://localhost:3000`, portanto seu callback local é
`http://localhost:3000/api/admin/meta/callback`. Em produção, usar HTTPS.
Cadastrar a URI exata em **Valid OAuth Redirect URIs** do App Meta, com Facebook
Login e Marketing API habilitados, domínio/URL do site e políticas exigidas pela Meta.
Se a configuração do App exigir HTTPS também no desenvolvimento, usar um domínio
HTTPS de desenvolvimento e ajustar ambas as variáveis de origem e retorno.

O App deve permitir `ads_read` ao usuário que autoriza. Em desenvolvimento, testar
com usuário com função no App e acesso à conta de anúncios. Para usuários externos,
obter os acessos/aprovações e verificações que a Meta exigir no painel do App.

### Permissões e limites

- Escopo solicitado: **ads_read**. O perfil básico fornece ID/nome de `/me`.
- Não solicita `ads_management` nem permite criação, edição, orçamento ou publicação.
- Negócios são consultados pelo campo `business` das contas acessíveis. Essa lista
  não equivale à lista completa de Business Managers do usuário. Sem autorização
  para detalhes do negócio, a leitura das contas de anúncios continua funcionando.
- Não solicita `business_management`, que não é necessário à leitura proposta.
- Graph/Marketing API fixada em v26.0 (versão do SDK oficial consultado nesta revisão).
- Até 20 páginas de 100 itens por coleção. O frontend avisa quando há truncamento.
- Gasto, alcance e demais totais são consultados no nível da conta; alcance não é
  somado entre campanhas. Datas seguem o fuso da conta. Orçamentos são atuais.

### Rotas

Todas exigem sessão ativa e OWNER/ADMIN. Métodos de escrita exigem origem idêntica
a `ADMIN_SITE_ORIGIN`. O callback verifica a sessão original pelo estado OAuth.

| Método e rota | Função |
| --- | --- |
| GET `/api/admin/meta/connect` | State seguro e redirecionamento oficial |
| GET `/api/admin/meta/callback` | Validação, troca de code, perfil, permissões, contas e gravação cifrada |
| GET `/api/admin/meta/status` | Estado seguro sem token |
| GET `/api/admin/meta/ad-accounts` | IDs, nomes, status, moeda, fuso e negócios associados |
| POST `/api/admin/meta/select-account` | `{ "accountId": "act_…" }`, validado contra a lista da Meta |
| POST `/api/admin/meta/test` | Valida token, perfil, ads_read e contas |
| POST `/api/admin/meta/disconnect` | Apaga o token local e autorizações pendentes |
| GET `/api/admin/meta/campaigns?days=30` | Campanhas, orçamento e insights reais |

### Proteções

State e cookie de vinculação têm 256 bits aleatórios e validade de dez minutos.
O banco guarda apenas os hashes, vinculados ao hash da sessão existente.
State é consumido atomicamente uma única vez. Logout, expiração e mudança de perfil
invalidam a autorização. Revisões impedem callback antigo de restaurar conexão
desfeita durante a troca do código.

O cookie principal permanece SameSite=Strict. Apenas um cookie temporário HttpOnly,
SameSite=Lax e Secure em produção é usado no retorno da Meta. O proxy deixa passar
somente GET no caminho exato do callback, que revalida a sessão original. Um HTML
mínimo sem segredos navega para Configurações após estabelecer contexto de mesma
origem, permitindo o envio normal do cookie Strict. Respostas usam no-store e
no-referrer. Códigos e erros brutos nunca são copiados para a página de resultado.

Token curto é trocado por token de longa duração no servidor. O banco armazena
AES-256-GCM com IV aleatório e App ID como contexto autenticado. Opcionalmente definir
`META_TOKEN_ENCRYPTION_KEY` com 64 caracteres hexadecimais. Na ausência, a chave é
derivada de App Secret/App ID por HKDF-SHA256. Secret/chave devem permanecer fora do
banco e dos backups do banco. Sua troca exige reconexão. Não há token em settings,
HTML, JSON público, cookies ou localStorage. Requests Graph usam Bearer e
appsecret_proof; a paginação nunca segue URLs fornecidas pela Meta.

A migração 2 adiciona somente as tabelas Meta, preservando sessões e tabelas atuais.
O cliente nunca recebe erro bruto nem credenciais. Tokens expirados/revogados pedem
nova autorização. Desconectar remove a conexão local; para revogar também a concessão
do App na Meta, usar as configurações de integrações comerciais da própria Meta.

### Validação

`node --test --test-isolation=none app/scripts/meta.test.mjs` cobre OAuth, scopes,
cancelamento, state/browser, replay, expiração, roles, CSRF, token inválido, cifragem,
paginação, contas, campanhas e o proxy. Respostas externas são controladas nos testes.
`node app/scripts/verify-admin-ui.cjs` valida imports/exports e renderização sem build.
Não há credenciais Meta no ambiente verificado; autorização ao vivo depende do App.

Referências oficiais:
- https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/
- https://developers.facebook.com/docs/marketing-api/get-started/authorization/
- https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/api.js
- https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/objects/ad-account.js
