# Homologação de assinaturas — sem cobrança real

## Diagnóstico atual

Resposta informada de produção: POST /preapproval, HTTP 400,
`CC_VAL_433 Credit card validation has failed`, código `rejected`.
O texto aponta para validação do cartão; não identifica o submotivo nem prova
ausência de campo do payer. Não há base para atribuir especificamente a CVV,
saldo, expiração, antifraude ou divergência de ambiente.

O código envia:

```json
{
  "preapproval_plan_id": "<ID do catálogo backend>",
  "payer_email": "<e-mail validado>",
  "card_token_id": "<token retornado pelo CardForm>",
  "external_reference": "<referência opaca da tentativa>",
  "status": "authorized",
  "reason": "<descrição do plano>",
  "back_url": "https://marquesano.com.br/checkout/sucesso"
}
```

O e-mail é validado e normalizado; o token deve ter 16–256 caracteres
alfanuméricos, hífen ou underscore. Essa verificação é apenas sintática.
O ID de plano vem do backend e é consultado no provedor antes do POST.
O CardForm usa o SDK oficial v2 com iframe e envia `getCardFormData().token`.
Não há validação local capaz de provar que um token opaco está válido,
não consumido e vinculado à mesma aplicação do Access Token.

## Preparação e execução

1. Crie/identifique vendedor e comprador de TESTE brasileiros no painel do
   Mercado Pago; use contas distintas. Confirme a identidade de teste do
   vendedor, não apenas o prefixo das credenciais.
2. Na aplicação do vendedor de teste, obtenha o par Public Key e Access Token
   correspondente. A orientação oficial para assinaturas usa as credenciais
   de produção dessa CONTA DE TESTE, não as da conta real da Marquesano.
3. Use um ambiente isolado de homologação e um catálogo de teste separado.
   Os IDs dos planos devem pertencer ao vendedor de teste. Não substitua IDs
   nem dados de planos do banco de produção.
4. Configure as duas credenciais somente nesse ambiente. Mantenha a origem
   pública HTTPS exigida pelo provedor. A back_url atual aponta para o site
   real, mas o sucesso deste checkout é tratado pela URL interna; não use
   essa navegação como evidência de aprovação do teste.
5. Abra o checkout em janela privada, sem sessão de vendedor real. Use o
   e-mail da conta de teste do comprador e os dados de cartão/documento
   indicados na documentação oficial brasileira de testes de assinaturas.
6. No navegador, confira sem copiar/logar valores sensíveis: tokenização
   bem-sucedida, token presente e e-mail do formulário correspondente ao
   comprador de teste. Gere um token novo para cada nova tentativa.
7. Submeta uma vez. Confira `MERCADOPAGO_RESPONSE`: HTTP status, status,
   message/error/cause/status_detail e request_id. Não exporte HAR bruto:
   ele pode conter token e dados pessoais.
8. Confirme o resultado pela consulta da assinatura na conta de teste.
   Em resultado incerto, use Verificar assinatura; não repita criação.
   Para CC_VAL_433 persistente, encaminhe request_id e horário ao suporte
   Mercado Pago, sem token, cartão ou credenciais.

## Fontes oficiais

- Assinaturas e procedimento de teste:
  https://www.mercadopago.com.br/developers/pt/news/2023/11/16/Questions-on-how-to-test-your-integration--
- Contrato de POST /preapproval:
  https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/create-preapproval/post

Nenhuma tentativa real foi executada nesta revisão. O par local tem prefixo
APP_USR em ambas as chaves; isso não comprova correspondência de aplicação
nem comprova o ambiente do token usado em produção.
