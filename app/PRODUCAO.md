# Marquesano — revisão de produção

Atualização do formulário em 19/09/2026: corrigidos o local do `.env` e o segredo com menos de 32 caracteres. GET e POST reais retornaram 200, com aceitação pelo Resend; 14 testes de contato/sessão e build aprovados. O recebimento na caixa de entrada permanece sem verificação. Veja [o diagnóstico atualizado](./CONTATO-DIAGNOSTICO.md); referências abaixo a envio apenas simulado descrevem a revisão anterior.

## Estado da entrega

Código compilado em produção. Hero principal preservado. WhatsApp real configurado. O envio real de e-mail **ainda depende das variáveis de ambiente e da verificação do domínio remetente**. Não declarar o formulário ativo antes de concluir o teste na caixa de entrada.

Último ajuste: a preparação do formulário acontece silenciosamente; falhas só aparecem após uma tentativa real de envio. A sessão é preparada/renovada automaticamente, sem exigir um segundo clique. Validação, botão bloqueado durante envio, proteção contra spam e confirmação após aceitação pelo provedor foram mantidos. O título da seção de planos passou para “Dê o próximo passo para o seu negócio”, com ajustes pontuais de linguagem na home.

Nesta rodada: `page.js`, `components/ContactForm.js`, `components/contact-session.mjs`, `server/contact.mjs`, `scripts/contact-session.test.mjs` e este documento. São 17 testes automatizados de contato, transporte e agenda aprovados; o envio ao provedor foi simulado.

O navegador automatizado não está disponível nesta sessão. Foram verificadas rotas, HTML, arquivos e regras de envio; inspeção visual desktop/tablet/mobile e teste do formulário pelo navegador permanecem pendentes.

## Contatos e identidade

- Número centralizado em `app/config/whatsapp.js`: `5511940702998`.
- Link usado pelos CTAs de WhatsApp: `https://wa.me/5511940702998`, em nova aba.
- O link respondeu com redirecionamento para a página oficial de conversa do WhatsApp. Nenhuma mensagem foi enviada; isso não confirma a existência de uma conta ativa no número.
- Cabeçalho: CTA em azul-claro com texto escuro e versão no menu móvel.
- Rodapé principal: fundo `#0a1320`, logo branco, navegação por páginas existentes, contato, domínio e copyright de 2026.
- Referências textuais e títulos provisórios “SuaMarca” foram substituídos por Marquesano.
- Nenhuma rota legal inexistente foi criada. Não havia links legais no projeto.
- Texto comercial atualizado para “Tecnologia moderna”, sem nomes de frameworks.

## Formulário: antes e depois

**Antes:** o componente `app/components/Experience.js` apenas atualizava estado React. Não havia endpoint, API route, server action, serviço externo, envio de e-mail ou armazenamento. Os formulários dos negócios fictícios e suas agendas continuam demonstrativos.

**Agora, na home e em `/contato`:** `app/components/ContactForm.js` chama o endpoint interno `GET/POST /api/contato`. O route handler está em `app/api/contato/route.js`; a validação e o envio ficam em `app/server/contact.mjs`.

O POST envia texto simples pela [API de e-mail do Resend](https://resend.com/docs/api-reference/emails/send-email). O destinatário e o remetente vêm exclusivamente do servidor. O endereço digitado pelo visitante vira `reply_to`, sem alterar o remetente verificado. Não há banco de dados nem persistência de mensagens no projeto; o serviço de envio processa o conteúdo e pode manter seu histórico de entrega.

### Configuração necessária

Usar `app/config/contact.env.example` como referência. **As variáveis reais devem ficar no painel da hospedagem ou no `.env.local` da raiz do projeto, ao lado de `package.json`; não dentro de `app`.**

| Variável | Conteúdo |
| --- | --- |
| `RESEND_API_KEY` | Chave de envio criada no Resend. |
| `CONTACT_TO_EMAIL` | Caixa real que receberá os contatos. |
| `CONTACT_FROM_EMAIL` | Endereço simples de remetente em domínio verificado no Resend. |
| `CONTACT_FORM_SECRET` | Segredo aleatório com pelo menos 32 caracteres. |
| `CONTACT_SITE_ORIGIN` | `https://marquesano.com.br`; em prévia local, usar a origem exata com porta. |
| `CONTACT_TRUSTED_IP_HEADER` | Opcional. Somente cabeçalho de IP sobrescrito de forma confiável pela hospedagem. |

Não utilizar `NEXT_PUBLIC_` nessas variáveis. Nunca versionar valores reais. Para gerar o segredo localmente, usar `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e copiá-lo diretamente para a configuração privada.

No Resend, cadastrar e verificar o domínio de envio, aplicando os registros DNS fornecidos pelo serviço. Configurar remetente e destinatário reais, definir as variáveis e fazer novo deploy/reiniciar o servidor. O domínio público do site não foi configurado no DNS ou na hospedagem por esta alteração.

### Proteções implementadas

- Validação no servidor de nome, e-mail, telefone, interesse e mensagem; limites de tamanho e rejeição de quebras de linha em cabeçalhos.
- Corpo JSON limitado; mensagem enviada como texto simples.
- Origem permitida verificada, sem CORS aberto.
- Campo invisível contra preenchimento automatizado; token assinado com expiração e tempo mínimo de preenchimento.
- Limite por e-mail e total de requisições; limite por IP opcional quando o cabeçalho for confiável.
- Prevenção de duplo clique, estado de envio, chave de idempotência no Resend e timeout.
- Mensagens claras de erro e sucesso; erros do provedor e credenciais não são repassados ao visitante.

O limite de requisições fica em memória por processo; não é compartilhado entre instâncias serverless. Antes de ampliar o tráfego, configurar também proteção/rate limiting na hospedagem. O formulário não exige banco ou SDK adicional.

### Testar após o deploy

1. Abrir `/contato` e verificar se o GET `/api/contato` retorna 200 com token; sem variáveis, retorna 503 e oferece WhatsApp.
2. Preencher nome, e-mail, telefone com DDD e mensagem com pelo menos 10 caracteres; aguardar alguns segundos e enviar.
3. Conferir POST 200, confirmação visível, bloqueio temporário do botão e **recebimento na caixa real**, incluindo spam. Verificar também o histórico de entrega do Resend.
4. Responder ao e-mail recebido e confirmar que `reply_to` aponta para o visitante.
5. Repetir na home; testar campos inválidos, clique duplo, erro de conexão e retomada após erro.
6. Testar as agendas e os formulários de exemplos separadamente: continuam identificados como simulações.

Sucesso no POST significa aceitação pelo provedor, não garantia de entrega final na caixa de entrada.

## Favicon e ícones

Os originais encontrados estão em `public/images/mazul.png` e `public/images/mbranco.png`. Não havia `favicon.ico`, `icon.png`, `apple-icon.png`, manifest nem configuração manual de ícones concorrente. Nenhum favicon antigo precisou ser removido.

Derivados criados:

| Arquivo | Uso |
| --- | --- |
| `public/favicon.ico` | Favicon tradicional azul, com imagens de 16, 32 e 48 px. |
| `public/icons/m-blue-32.0394425698.png` | Favicon principal/default de 32 px, adequado a fundo claro. |
| `public/icons/m-white-32.0394425698.png` | Variante branca de 32 px com `prefers-color-scheme: dark`. |
| `public/icons/apple-touch-180.0394425698.png` | Apple Touch Icon azul, 180 px, com fundo branco opaco. |

Os PNGs originais não foram alterados. Nos derivados, foram removidas apenas margens totalmente transparentes e aplicado redimensionamento proporcional com espaço de segurança; o desenho e as cores foram preservados.

**Configuração única:** `metadata.icons` de `app/layout.js`, importando `app/config/icons.js`, conforme a [API de metadados do Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata). Não há tags manuais concorrentes nem arquivos automáticos `app/icon.png`/`app/apple-icon.png`.

Os PNGs têm hash no nome e o shortcut `.ico` tem versão na URL. A rota convencional `/favicon.ico` também existe para navegadores que a solicitem diretamente. A escolha da variante por tema depende do suporte do navegador. Apple usa explicitamente a versão azul com fundo claro. Não foi criado manifest/PWA porque essa estrutura não existia.

Para regenerar após uma futura troca dos originais: `node app/scripts/generate-icons.cjs` na raiz, seguido do build. Verificar os ícones servidos no deploy; se o navegador mantiver cache antigo, testar em perfil limpo/aba privada e limpar o cache específico do site. A versão em URL reduz, mas não elimina todos os caches de favicon.

## Verificações realizadas

- `npm.cmd run build`: aprovado, com rota dinâmica `/api/contato`.
- `node --test scripts/contact.test.mjs scripts/availability.test.mjs` dentro de `app`: 12 testes aprovados. O provedor é simulado; nenhum e-mail real foi enviado.
- `scripts/verify-project.cjs`: 12 páginas com HTTP 200, links/âncoras locais, imagens, WhatsApp, rodapé e quatro declarações de ícones.
- SHA-256 do hero confere com a versão original preservada.
- `npm.cmd audit --omit=dev`: nenhum achado retornado nesta execução.
- Warning do build: base `baseline-browser-mapping` desatualizada. É um aviso de dados de compatibilidade e não impediu a compilação; não foram adicionadas dependências só para silenciá-lo.

Revisão visual pendente: desktop (1440 px), tablet (768/1024 px), celular (360/390 px), menu aberto, links do rodapé, foco por teclado, tamanho dos ícones, mensagens de erro/sucesso e posição do botão flutuante. A ferramenta disponível não conseguiu abrir o navegador.

## Arquivos

- Identidade/contatos: `app/components/MainFooter.js`, `Experience.js`, `Commerce.js`, `Commercial.js`, `QuarterlyReview.js`, `app/config/whatsapp.js`, `app/production.css`, `app/layout.js`, `app/page.js`.
- E-mail: `app/components/ContactForm.js`, `app/api/contato/route.js`, `app/server/contact.mjs`, `app/config/contact.env.example`, `app/scripts/contact.test.mjs`.
- Ícones: `app/config/icons.js`, `app/scripts/generate-icons.cjs`, `public/favicon.ico` e os três PNGs em `public/icons/`.
- Marca nos títulos/créditos: páginas de Serviços, Portfólio, Planos, Sobre, Contato e exemplos existentes.
- Verificação/documentação: `app/scripts/verify-project.cjs` e `app/PRODUCAO.md`.

As imagens `mazul.png`, `mbranco.png` e `mcor.png` já pertenciam ao usuário e estavam sem rastreamento no Git. Não foram modificadas nem removidas; incluir os arquivos utilizados no commit/deploy.
