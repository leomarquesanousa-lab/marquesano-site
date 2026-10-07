# Auditoria de SEO — Marquesano e Pet Find

Escopo: páginas públicas estáticas e dinâmicas do projeto; mercado brasileiro e idioma pt-BR. Implementação local, sem publicação automática. Sem alteração de autenticação, permissões, schema de banco, preços, contratos ou assets originais de marca.

## 1. Problemas encontrados e correções

- Títulos comerciais genéricos como “Serviços” e “Planos”: substituídos por títulos descritivos da intenção da página, com descrições próprias e previews Open Graph/Twitter correspondentes.
- Pet Find usava ADMIN_SITE_ORIGIN como domínio canônico: substituído pelo domínio público único https://marquesano.com.br, independente de configurações administrativas ou localhost.
- Sitemap descobria apenas arquivos estáticos: agora inclui seções, categorias com anúncios, cidades existentes, guias publicados e anúncios públicos visíveis de donos ativos. Não gera cidades fictícias nem novas URLs para anúncios existentes.
- O alias /administracao poderia entrar no sitemap: removido da descoberta, junto às áreas de contratação e checkout.
- Robots bloqueava toda a API, incluindo imagens públicas dos anúncios e previews sociais: adicionadas permissões específicas para /api/portal/photos/ e /api/pet-assets/, preservando bloqueio das APIs internas.
- Robots não explicitava áreas de conta/publicação/checkout: adicionadas exclusões. O noindex existente nas páginas privadas foi preservado.
- Anúncios tinham títulos de busca derivados apenas do texto livre e cidade: metadata agora usa espécie, situação, cidade e UF, com nome, raça e bairro reais na descrição quando informados.
- Visibilidade de metadata de anúncios administrativos dependia apenas da moderação: agora a elegibilidade pública também considera a visibilidade real da conta proprietária, sem alterar permissões.
- Headings comerciais pouco descritivos: textos de H1 aprimorados sem trocar classes ou estrutura visual. Nas listagens de Pets, cards/estados vazios usam H2 após o H1; na home e nos detalhes continuam H3 após os H2.
- Conteúdo de serviços pouco explícito sobre assinatura, hospedagem, manutenção, domínio e prazo: esclarecimentos naturais, vinculados à proposta/plano, sem promessas de entrega ou condições inventadas.
- Links de conversão entre exemplos e planos eram insuficientes: acrescentadas referências nos avisos de demonstração; serviços também liga para planos e portfólio.
- Schema institucional era básico e breadcrumbs não refletiam níveis de exemplos: enriquecidos. FAQ usa a mesma fonte de dados das perguntas visíveis, evitando divergências.
- Páginas legais, guias e listagens não tinham schema contextual completo: adicionados WebPage e BreadcrumbList; guias receberam Article com informações existentes.
- Preview social ainda continha “laços & patas”: identificado e corrigido para Pet Find, com mensagem voltada ao Brasil.
- Banner principal e logo Pet Find eram PNGs grandes: servidos com next/image, sem editar os arquivos originais. O hero é pré-carregado e recebe versões responsivas; logo mantém proporção e classes existentes.
- Imagens abaixo da dobra na home não tinham carregamento tardio/dimensões: adicionados lazy loading, dimensões e parâmetros de tamanho nas fotos externas. Miniaturas de galeria também usam lazy loading.
- Fontes de Pets eram carregadas por @import dentro do CSS: movidas para stylesheet com preconnect no layout, mantendo as mesmas famílias e pesos com display=swap.

## 2. Arquivos alterados/criados nesta auditoria

- config/site.mjs
- config/metadata.js
- config/faq.mjs
- components/Commercial.js
- components/Experience.js
- components/StructuredData.js
- page.js
- globals.css
- servicos/page.js
- planos/page.js
- sobre/page.js
- contato/page.js
- portfolio/page.js
- exemplos/clinica/page.js
- exemplos/barbearia/page.js
- exemplos/restaurante/page.js
- exemplos/restaurante/menu/page.js
- exemplos/comercio/page.js
- exemplos/servicos/page.js
- politica-de-privacidade/page.js
- termos-de-servico/page.js
- exclusao-de-dados/page.js
- robots.js
- sitemap.js
- server/seo.mjs
- pets/layout.js
- pets/page.js
- pets/portal.css
- pets/lib/seo.mjs
- pets/lib/constants.mjs
- pets/lib/sitemap.mjs
- pets/[section]/[[...segments]]/page.js
- pets/cidades/[state]/[city]/page.js
- pets/pet/[slug]/page.js
- pets/guias/page.js
- pets/guias/[slug]/page.js
- pets/termos/page.js
- pets/privacidade/page.js
- pets/components/PetsStructuredData.js
- pets/components/ListingPage.js
- pets/components/PetCard.js
- pets/components/PetLogo.js
- pets/components/DetailControls.js
- api/pet-assets/[asset]/route.js
- scripts/seo-audit.mjs
- seo-audit-results.json
- SEO-AUDITORIA.md

Mudanças de tarefas anteriores, como auth/admin/storage e carrossel, não integram esta lista salvo arquivos que receberam ajustes de SEO nesta auditoria.

## 3. Metadata e palavras-chave por página

Todas as URLs indexáveis usam canonical absoluto oficial, idioma pt-BR e previews sociais em pt_BR. Títulos e descrições são exclusivos nas URLs atuais verificadas. Keywords são diretrizes editoriais usadas naturalmente no conteúdo; não foi feita pesquisa de volume de buscas.

| Página | Título final | Intenção / palavras-chave principais |
| --- | --- | --- |
| / | Criação de sites por assinatura para empresas \| Marquesano | criação de sites; site profissional; site por assinatura para empresas |
| /contato | Contato para criação de site profissional \| Marquesano | contato Marquesano; orçamento de site profissional |
| /exclusao-de-dados | Exclusão de Dados \| Marquesano | exclusão de dados Marquesano |
| /exemplos/barbearia | Site para barbearia: exemplo de design \| Marquesano | site para barbearia; agendamento demonstrativo |
| /exemplos/clinica | Criação de site para clínica: exemplo \| Marquesano | criação de site para clínica; site para saúde demonstrativo |
| /exemplos/comercio | Criação de site para comércio: exemplo \| Marquesano | criação de site para comércio; catálogo demonstrativo |
| /exemplos/restaurante | Criação de site para restaurante: exemplo \| Marquesano | criação de site para restaurante; cardápio; reservas demonstrativas |
| /exemplos/restaurante/menu | Cardápio digital demonstrativo para restaurante \| Marquesano | cardápio digital demonstrativo para restaurante |
| /exemplos/servicos | Site para prestadores de serviços: exemplo \| Marquesano | criação de site para prestadores de serviços |
| /pets | Pets perdidos, encontrados e para adoção no Brasil \| Pet Find | pets perdidos; animais encontrados; pets para adoção no Brasil |
| /pets/adocao | Pets para adoção \| Pet Find | pets para adoção responsável |
| /pets/cidades/sp/sao-paullo | Pets em Sao paullo - SP \| Pet Find | pets perdidos, encontrados e para adoção + cidade/UF reais |
| /pets/guias | Guias para encontrar pets perdidos e adotar \| Pet Find | como encontrar pet perdido; ajudar animal encontrado; adoção responsável |
| /pets/guias/adocao-responsavel | Adoção responsável: um novo começo \| Pet Find | adoção responsável; cuidados ao adotar |
| /pets/guias/encontrei-um-pet-como-ajudar | Encontrei um pet: como ajudar com cuidado \| Pet Find | encontrei um pet; como ajudar animal encontrado |
| /pets/guias/meu-pet-sumiu-o-que-fazer | Meu pet sumiu. Por onde começar? \| Pet Find | pet sumiu; como procurar animal perdido |
| /pets/pet/ave-cinza-6f98838d | Ave perdida em Sao paullo - SP \| Pet Find | espécie + situação + cidade/UF reais; nome, bairro e raça informados |
| /pets/pets-encontrados | Pets encontrados \| Pet Find | pets encontrados; espécie quando filtrada |
| /pets/pets-perdidos | Pets perdidos \| Pet Find | pets perdidos; espécie quando filtrada |
| /pets/pets-perdidos/aves | Pets perdidos — Aves \| Pet Find | pets perdidos; espécie quando filtrada |
| /pets/pets-perdidos/cidade/sp/sao-paullo | Pets perdidos em Sao paullo · SP \| Pet Find | situação do pet + cidade/UF reais |
| /pets/privacidade | Política de privacidade \| Pet Find | política de privacidade; tratamento de dados |
| /pets/reencontrados | Histórias de reencontro \| Pet Find | pets reencontrados; histórias de reencontro |
| /pets/termos | Termos de uso \| Pet Find | termos de uso; condições do serviço |
| /planos | Planos de site por assinatura \| Marquesano | planos de site por assinatura; preço de criação de site; site com hospedagem e suporte |
| /politica-de-privacidade | Política de Privacidade \| Marquesano | política de privacidade; tratamento de dados |
| /portfolio | Portfólio de sites profissionais por segmento \| Marquesano | exemplos de sites profissionais; portfólio de criação de sites |
| /servicos | Criação e manutenção de sites profissionais \| Marquesano | criação e desenvolvimento de sites; manutenção de site; hospedagem; site para pequenas empresas |
| /sobre | Sobre a Marquesano: sites para pequenas empresas | Marquesano; criação de sites para pequenas empresas |
| /termos-de-servico | Termos de Serviço \| Marquesano | termos de uso; condições do serviço |

### Descrições finais verificadas

- **/**: Criação de sites profissionais para pequenas empresas no Brasil. Planos por assinatura com hospedagem, manutenção e suporte; domínio conforme o plano.
- **/contato**: Fale com a Marquesano sobre a criação do site da sua empresa. Tire dúvidas sobre planos por assinatura, escopo, domínio, hospedagem e suporte.
- **/exclusao-de-dados**: Instruções para solicitar a exclusão de dados e revogar integrações vinculadas à Marquesano.
- **/exemplos/barbearia**: Navegue pelo site demonstrativo Black House, com serviços e agendamento para barbearia. Veja possibilidades para seu negócio e os planos Marquesano.
- **/exemplos/clinica**: Explore a Clínica Aurora, demonstração de site para clínica com especialidades, equipe e agendamento. Conheça os planos de criação de sites da Marquesano.
- **/exemplos/comercio**: Explore Bosque Store, uma vitrine demonstrativa para comércio com catálogo de produtos. Veja possibilidades para seu site profissional com a Marquesano.
- **/exemplos/restaurante**: Conheça Casa Sapore, exemplo demonstrativo de site para restaurante com cardápio e reservas. Explore o projeto e os planos de sites por assinatura.
- **/exemplos/restaurante/menu**: Explore o cardápio digital fictício da Casa Sapore e veja como apresentar pratos em um site para restaurante. Exemplo do portfólio Marquesano.
- **/exemplos/servicos**: Veja um site demonstrativo para prestadores de serviços, com apresentação do atendimento e formulário de contato. Conheça os planos da Marquesano.
- **/pets**: Divulgue gratuitamente pets perdidos, encontrados e para adoção no Brasil. Compartilhe anúncios e ajude animais a reencontrar suas famílias.
- **/pets/adocao**: Conheça pets para adoção responsável no Brasil. Veja fotos e informações reais dos anúncios e converse com o responsável.
- **/pets/cidades/sp/sao-paullo**: Encontre pets perdidos, encontrados e para adoção em Sao paullo - SP. Consulte anúncios com fotos e localização aproximada e ajude na sua região.
- **/pets/guias**: Orientações para procurar um pet perdido, ajudar animais encontrados e realizar uma adoção responsável. Guias gratuitos do Pet Find.
- **/pets/guias/adocao-responsavel**: Uma decisão com carinho, planejamento e compromisso por toda a vida.
- **/pets/guias/encontrei-um-pet-como-ajudar**: Saiba como divulgar um animal encontrado e buscar sua família com segurança.
- **/pets/guias/meu-pet-sumiu-o-que-fazer**: Um plano prático para organizar a busca, avisar a vizinhança e compartilhar as informações certas.
- **/pets/pet/ave-cinza-6f98838d**: Ave perdida em Sao paullo - SP. Nome: pALO. Raça: Mestiço. Bairro: Cambuci. tetetetetetetete ter ett e tert er tert etre tre t er er re er ter re er
- **/pets/pets-encontrados**: Consulte anúncios de animais encontrados no Brasil e ajude a localizar seus responsáveis. Busque por espécie, cidade e bairro.
- **/pets/pets-perdidos**: Encontre anúncios de pets perdidos no Brasil. Consulte fotos, características e localização aproximada para ajudar nas buscas.
- **/pets/pets-perdidos/aves**: Pets perdidos — Aves. Encontre anúncios de pets perdidos no Brasil. Consulte fotos, características e localização aproximada para ajudar nas buscas.
- **/pets/pets-perdidos/cidade/sp/sao-paullo**: Pets perdidos em Sao paullo · SP. Encontre anúncios de pets perdidos no Brasil. Consulte fotos, características e localização aproximada para ajudar nas buscas.
- **/pets/privacidade**: Saiba como o Pet Find trata dados de contas, fotos e contatos públicos, cookies e o controle dos seus anúncios de pets.
- **/pets/reencontrados**: Laços que se encontraram outra vez. Cada reencontro importa.
- **/pets/termos**: Conheça as regras de publicação gratuita, responsabilidade pelos anúncios, moderação e contatos no portal Pet Find.
- **/planos**: Compare planos de criação de site por assinatura com hospedagem e suporte. Confira preços, domínio, escopo e quantidade de cobranças antes de contratar.
- **/politica-de-privacidade**: Saiba como a Marquesano coleta, utiliza e protege informações, como funcionam as integrações autorizadas e como solicitar a exclusão dos seus dados.
- **/portfolio**: Explore sites demonstrativos para clínica, restaurante, barbearia e comércio. Conheça possibilidades de design para o site profissional do seu negócio.
- **/servicos**: Desenvolvimento de sites para pequenas empresas no Brasil, com design responsivo, hospedagem, manutenção e suporte conforme o plano contratado.
- **/sobre**: Conheça a Marquesano e sua proposta de criação de sites profissionais por assinatura para pequenas empresas, com design e acompanhamento contínuo.
- **/termos-de-servico**: Termos aplicáveis ao uso do site, serviços digitais e integrações oferecidas pela Marquesano.

Não foram criadas páginas para imobiliária, rádio ou loja virtual, pois não foi confirmado um serviço específico correspondente. A vitrine fictícia do exemplo de comércio não foi tratada como loja virtual operacional. “Site barato” não virou promessa comercial sem uma definição/condição real de preço.

## 4. Structured data

- Organization e WebSite: Marquesano, domínio e logo oficiais, idioma pt-BR.
- WebPage: páginas comerciais, legais e Pets.
- Service: home e serviços, criação/manutenção de sites por assinatura, área atendida Brasil.
- BreadcrumbList: hierarquia das páginas comerciais, exemplos, menu de restaurante, listagens, artigos e anúncios Pets (nesting em WebPage nos anúncios).
- FAQPage: cinco perguntas reais da home; respostas idênticas ao conteúdo visível.
- Article: guias publicados do Pet Find, headline, excerpt, data real de atualização, publisher e imagem social.
- Não foram adicionados LocalBusiness, avaliações, endereços fictícios nem Product/Offer sobre animais ou negócios demonstrativos.

FAQPage não implica rich result de FAQ para a Marquesano: o Google restringe esse recurso a sites governamentais e de saúde reconhecidos. [Orientação oficial](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

## 5. Sitemap e robots

- /sitemap.xml gerado no servidor, sem repetir URLs.
- lastModified apenas para artigos/anúncios com data real válida; não usa “agora” para fingir atualização.
- Cidades baseadas somente nos registros existentes; categorias com conteúdo público; anúncios ocultos ou de donos inativos excluídos.
- Não inclui login, cadastro, conta, publicação, admin, alias administrativo, checkout, APIs ou resultados de busca livres.
- Filtros/paginação de Pets continuam noindex e apontam para a listagem canônica sem parâmetros. Essas listagens filtradas podem ser rastreadas para que o noindex seja lido.
- Áreas privadas bloqueadas no robots, mantendo as tags noindex existentes. Robots controla rastreamento, não substitui proteção de acesso nem garante remoção de uma URL já indexada. [Documentação Google](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).
- Fotos públicas e imagem social explicitamente permitidas para rastreamento.
- URLs com barra final redirecionam por HTTP 308 para a versão sem barra nos exemplos locais /servicos/ e /pets/.
- Com crescimento acima de 50.000 URLs, dividir o sitemap em arquivos/índice conforme [limites oficiais](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## 6. Pet Find

- Marca de metadata/social: Pet Find, com publisher Marquesano e foco Brasil.
- Espécie/situação/localização reais nos anúncios; ausência de informações opcionais não cria dados fictícios.
- Slugs/rotas existentes preservados; nenhum anúncio foi renomeado ou alterado no banco.
- Cidades e categorias continuam usando as rotas suportadas e seus dados reais.
- Fotos dos anúncios acessíveis ao crawler; galeria e compartilhamento preservados.
- Anúncios privados não recebem schema público; metadata noindex para conteúdo visível somente ao dono/admin.
- Dados digitados pelo usuário, inclusive grafia da cidade, são mantidos literalmente. Correções editoriais devem ser feitas pelo responsável, não por suposição do SEO.

## 7. Performance e validação

Build: npm.cmd run build — sucesso, Next.js 16.3.5.

Validação HTTP do build com PostgreSQL existente: 30 URLs indexáveis atuais, títulos/descrições distintos, um H1 por página, canonical oficial, lang pt-BR, Open Graph/Twitter, alt em todas as imagens renderizadas, JSON-LD parseável e 52 links internos sem 404/5xx. A evidência final está em seo-audit-results.json; o teste reproduzível está em scripts/seo-audit.mjs.

Otimização de imagens medida localmente, Accept: image/webp, qualidade 75:

| Asset | Original | Resposta otimizada testada |
| --- | --- | --- |
| /images/hero-tech.png | 1.826.235 bytes | 94.742 bytes, largura solicitada 1920 |
| /images/logo-pet.png | 843.684 bytes | 9.050 bytes, largura solicitada 256 |

Isso mede tamanho de resposta, não resultados reais de LCP/INP/CLS. Nenhuma biblioteca de SEO foi instalada. Componentes de conteúdo e metadata continuam no servidor; não houve refatoração ampla dos componentes interativos.

## 8. Dependências de produção e Search Console

- Publicar o build para que as alterações cheguem ao Google; não foi feito deploy.
- Garantir DATABASE_URL no runtime e ADMIN_SITE_ORIGIN HTTPS válido para a conexão oficial existente. O .env da raiz estava sem DATABASE_URL durante o teste; a configuração completa estava em app/.env. A origem administrativa local não passa na validação de produção. A auditoria usou variáveis somente no processo temporário e não modificou os arquivos de ambiente.
- Verificar redirecionamentos HTTPS e www/apex na hospedagem e remover eventuais headers noindex globais do servidor/CDN.
- Enviar sitemap, inspecionar URLs, acompanhar canônicos escolhidos, cobertura, consultas e desempenho no Google Search Console.
- Validar rich results suportados na produção; JSON-LD correto não garante destaque no Google.
- Medir Core Web Vitals com PageSpeed Insights e dados de campo; qualidade do cache/CDN, latência do banco e fotos R2 também dependem da infraestrutura real.
- URLs inexistentes de anúncios/guias usam notFound() e recebem noindex. No Next.js instalado, respostas já transmitidas por streaming podem ter status 200; o teste distingue esse comportamento de uma página válida indexável. Se Search Console reportar soft 404 indevido, verificar a resposta realmente recebida pelo Google e a configuração de streaming na hospedagem. [Convenção Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found).
- O sitemap dinâmico requer banco disponível e tabelas Pets previamente migradas pelo fluxo existente. Nenhuma migration nova foi criada nesta auditoria.

## 9. Build final

Build de produção concluído com sucesso. O escopo permaneceu em SEO, conteúdo editorial, links e otimizações seguras de carregamento, com identidade visual, autenticação, regras comerciais e schema do banco preservados.

## Revisão final antes da publicação

Revisão técnica limitada às alterações de SEO. Auditoria HTTP repetida: 30 URLs públicas do sitemap e 52 links internos, sem falhas, canônicos oficiais e sem noindex indevido. Títulos dinâmicos de Pets verificados não estão vazios. Schema revisado sem avaliações, endereços ou preços inventados; conteúdo sem repetição artificial de palavras-chave.

Erro real encontrado e corrigido: a conversão do hero para next/image perdeu o recorte responsivo. page.js e globals.css agora preservam center no desktop, 64% center até 980px e 70% center até 680px, mantendo o asset original. Build final aprovado após a correção.

A inspeção visual desta revisão foi por markup/CSS; a ferramenta de navegador não iniciou, portanto não houve captura visual final. A configuração do runtime de produção permanece uma condição de implantação, conforme seção 8.
