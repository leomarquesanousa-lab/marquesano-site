# Diagnóstico do formulário de contato

## Causas do 503 e correções

1. O arquivo estava em `app/.env`. A raiz do Next é `C:\tech\site-assinatura-starter`, onde fica `package.json`. O carregador `@next/env` não encontrava arquivos e as cinco variáveis estavam ausentes. O arquivo privado foi movido para `.env` na raiz.
2. Após o carregamento correto, `CONTACT_FORM_SECRET` ainda falhava por ter menos de 32 caracteres. Foi substituído no arquivo privado por um segredo gerado com `crypto.randomBytes(32).toString('hex')`, sem imprimir o valor.

Não havia `.env.local` concorrente nem configuração personalizada do Next/webpack. `next dev --webpack` foi mantido e validado. Node puro não carrega automaticamente os arquivos de ambiente do Next; um teste isolado sem o carregador não reproduz esse runtime.

## Verificação segura

Na raiz do projeto, executar `node app/scripts/contact-config.mjs`. O script usa `@next/env`, resolve a raiz independentemente do diretório atual e mostra somente nomes dos arquivos e resultados booleanos. Código de saída 1 indica configuração obrigatória inválida.

O Next prioriza variáveis já existentes em `process.env`, depois `.env.$NODE_ENV.local`, `.env.local` (exceto em testes), `.env.$NODE_ENV` e `.env`. Manter um único arquivo local com as credenciais e reiniciar o servidor após mudanças.

`CONTACT_FROM_EMAIL=noreply@maconfeccoes.com.br` e `CONTACT_TO_EMAIL=suporte@maconfeccoes.com.br` passam na validação. O remetente deve conter somente o endereço; o código acrescenta `Marquesano <...>`. O segredo precisa ter pelo menos 32 caracteres. Em desenvolvimento, `CONTACT_SITE_ORIGIN=http://localhost:3000`; em produção, configurar `https://marquesano.com.br` no ambiente da hospedagem.

O handler mantém literalmente `https://api.resend.com/emails`. A inspeção em UTF-8 não encontrou corrupção das mensagens; a exibição anterior do PowerShell usava uma codificação incompatível.

## Diagnósticos e testes

Falhas de configuração registram apenas booleanos no servidor em desenvolvimento. Rejeições do Resend registram status, nome e mensagem do provedor, com chave e segredo removidos, somente quando `NODE_ENV=development`. A resposta pública permanece genérica; não existe endpoint público de diagnóstico.

Validação realizada em 19/09/2026 com Next.js 16 e webpack:

- GET `/api/contato`: 200, token presente, `Cache-Control: no-store`.
- POST com dados inválidos: 400.
- POST real com token válido: 200 e `ok: true`, após aceitação pelo Resend. Uma mensagem identificada como teste técnico foi enviada para o destinatário configurado. Aceitação não confirma recebimento na caixa de entrada.
- 14 testes de handler e sessão aprovados, incluindo os endereços configurados, segredo de 31/32 caracteres, falhas do provedor, ocultação de segredos e ausência de logs técnicos em produção.
- Build de produção aprovado com `.env` carregado e `/api/contato` dinâmica.

Comando de testes dentro de `app`: `node --test --test-isolation=none scripts/contact.test.mjs scripts/contact-session.test.mjs`.

Referências: [ambiente do Next.js](https://nextjs.org/docs/app/guides/environment-variables) e [envio pelo Resend](https://resend.com/docs/api-reference/emails/send-email).
