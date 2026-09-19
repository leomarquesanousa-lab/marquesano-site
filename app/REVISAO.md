# Revisão do portfólio comercial

## Preservação da home

O markup inteiro da seção `heroV9` foi preservado. A imagem `/images/hero-tech.png` e o CSS original em `globals.css` não foram alterados. O cabeçalho ganhou navegação real e um menu para celular. Os refinamentos adicionais ficam em `refined.css`, com seletores isolados do hero.

## Páginas

- `/`: home comercial, com novo formulário e refinamentos abaixo do hero.
- `/servicos`: serviços e processo de trabalho.
- `/portfolio`: quatro projetos demonstrativos navegáveis.
- `/planos`: comparação de planos e seleção encaminhada ao contato.
- `/sobre`: apresentação e proposta de trabalho.
- `/contato`: formulário com plano selecionado pela URL.
- `/exemplos/restaurante/menu`: menu editorial com sete categorias.
- Rotas de clínica, barbearia, restaurante, comércio e serviços preservadas.

## Organização

- `components/Experience.js`: navegação responsiva, SVG, fotografias adaptativas, formulários, mapas ilustrativos, depoimentos e rodapés.
- `components/Commercial.js`: páginas comerciais, planos e portfólio.
- `components/Restaurant.js`: restaurante e menu.
- `components/Barber.js`: barbearia vintage, serviços, equipe e galeria.
- `components/Commerce.js`: catálogo, filtros, seleção de produtos e prévia de WhatsApp.
- `refined.css`: novos estilos e ajustes responsivos.
- `page.js`, `layout.js` e páginas em `exemplos/`: integração e refinamento.
- `scripts/verify-project.cjs`: checagem do hero, rotas, links, âncoras, imagens e padrões dos campos.

## Interações

Menu para celular, navegação por páginas, seleção de plano, filtros da vitrine, consulta de produto com preenchimento automático, prévia de conversa, formulários com validação, reservas e agendamentos com resumo. Datas passadas e dias sem atendimento são bloqueados. A clínica atende de segunda a sexta. A barbearia permite escolher um profissional.

Os formulários são demonstrações locais: não enviam nem armazenam dados. O WhatsApp comercial com número zerado foi removido. Para produção, é necessário conectar os formulários a um canal real e informar o telefone do negócio. Preços, profissionais, endereços, marcas dos exemplos e depoimentos são fictícios.

## Segunda rodada: acabamento visual e agendas

- Menu com tipografia, peso, espaçamento e indicação da página atual refinados.
- Campos, botões, foco e formulários com acabamento mais consistente.
- Hero da barbearia reduzido para uma faixa de 420–530 px no desktop, com conteúdo centralizado e a fotografia original preservada. Em celulares a altura acompanha o conteúdo, mantendo texto e cadeira lado a lado.
- Hero do restaurante com altura flexível, conteúdo reposicionado e respiro inferior depois dos botões.
- Ajustes discretos de leitura, espaçamento e componentes da clínica, home e comércio. Nenhuma imagem substituída nesta rodada.
- Agenda visual compartilhada em `components/BookingCalendar.js`, com mês atual e dois meses seguintes, verde para disponível, laranja para ocupado, legenda textual, horários selecionáveis e resumo.
- Regras demonstrativas em `components/availability.mjs`: disponibilidade estável, dias lotados, horários ocupados, bloqueio de datas passadas e dias sem atendimento. A clínica funciona agora apenas de segunda a sexta; a barbearia mantém segunda a sábado e o restaurante, terça a domingo.
- Verificações das regras em `scripts/availability.test.mjs`, executadas com `node --test scripts/availability.test.mjs` dentro de `app`.

Arquivos desta rodada: `components/Experience.js`, `components/BookingCalendar.js`, `components/availability.mjs`, `refined.css`, `exemplos/clinica/page.js`, `scripts/availability.test.mjs` e este documento.

A inspeção visual no navegador continua pendente por indisponibilidade da ferramenta nesta sessão. Revisar especialmente a cadeira no recorte móvel, a altura do hero da barbearia em notebooks, o espaço abaixo dos CTAs do restaurante e a seleção de datas/horários por toque e teclado.

## Recursos visuais

Fotografias do CDN da Pexels foram integradas e inspecionadas: consulta clínica, atendimento, salão e pratos do restaurante, chef, barbearia, interiores, produtos e decoração. A ecobag usa a fotografia [Person Holding White Tote Bag, cottonbro studio](https://www.pexels.com/photo/person-holding-white-tote-bag-4068314/). Os demais IDs estão junto aos componentes que os utilizam. Não foram geradas imagens por IA. Fotografias de produtos e equipes são ilustrativas.

Novos recursos em CSS/SVG: mapa ilustrativo, monograma editorial, ícone de seta, selo tipográfico da barbearia e estados de foco/seleção. As imagens compartilhadas usam `srcSet`, `sizes` e carregamento tardio fora dos heros. Continuam dependendo do CDN externo.

## Verificação

Na raiz do projeto: `npm.cmd run build`.

Com o site acessível em `http://localhost:3000`, dentro de `app`: `node scripts/verify-project.cjs`.

Compilação de produção e checagens HTTP/HTML executadas. O navegador automatizado não está disponível nesta sessão; a inspeção visual final em desktop e celular e a execução ponta a ponta dos formulários no navegador permanecem pendentes. O código inclui breakpoints, menu móvel, foco visível, rótulos e mensagens com `aria-live`.

Nenhuma dependência foi adicionada. Next.js e JavaScript foram mantidos.
