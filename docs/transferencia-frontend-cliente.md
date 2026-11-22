# Transferência do frontend do Cliente — FixIt 2.0

## Origem, destino e histórico

- Origem: `https://github.com/Rebecamarini/FixIt.git`, branch `ClientView`, HEAD `66b15c40158c8558d34d94e4ccebb1d9cf47d9f6`.
- Implementações identificadas: `748ffc6` (frontend inicial) e `66b15c4` (integração real e remoção de demonstrações), de Rebecamarini, comparadas à base `b9cb740`.
- Destino confirmado: `https://github.com/Rebecamarini/Fixit2.0.git`.
- Branch principal: `main`, base `47e7a27032a5f1a71c93807d4902b7b21a417d87`. Referências atualizadas por clone e `git fetch origin --prune`; a base permaneceu igual.
- Branch de trabalho: `feat/frontend-cliente`, criada da main do destino; histórias dos repositórios são independentes. Não foi aplicado merge/cherry-pick do backend antigo.
- A alteração não commitada em `knip.jsonc` na origem foi preservada e excluída da transferência. Nenhum arquivo da origem foi alterado.

O pedido explícito de transferência autoriza importar o frontend, como exceção pontual à orientação histórica do ADR 0001 contra importar funcionalidades da versão antiga. As regras de negócio do `CONTEXT.md` do destino continuam prevalecendo.

## Comparação e conflitos resolvidos

Ambos usam Next.js App Router, React, TypeScript, CSS Modules e Supabase. A origem usa Next 16.4.2; o destino mantém Next 16.4.6 e todas as suas dependências e lockfile. A documentação instalada do Next foi consultada para páginas, formulários, Server Actions e erros.

| Origem | Adaptação ao destino |
| --- | --- |
| `src/server/session.ts`, `identity.ts`, `account.ts` | Usar `src/lib/auth.ts` e `src/lib/supabase/server.ts` existentes; nenhuma substituição do Auth ou proxy. |
| `perfis`, papéis capitalizados | `profiles`, `cliente`/`gestor`/`manutentor`, perfil ativo exigido. |
| `assunto`, `estado`, `criado_em` | `titulo`, `status`, `created_at`; mostrar `numero` sequencial e usar UUID nos links. |
| Categoria, campos complementares, representação de outro solicitante | Não existem no MVP do destino; formulário adaptado a título, descrição e local. Não importar tabelas, RPCs, migrations ou abertura em nome de terceiros. |
| RPC `us009_enviar_solicitacao` | RPC existente `abrir_solicitacao(p_titulo,p_descricao,p_local)`, com autoria e histórico garantidos no banco. |
| Prioridade/responsável indisponíveis; contrato só Pendente | Exibir prioridade, responsável, cinco estados e eventos reais do destino. Reutilizar histórico do painel. |
| Link de edição do perfil | Mostrar nome autenticado no Header, sem link para rota de edição ausente no MVP. |
| Home inicial do destino | Substituída pelo Dashboard do Cliente; equipe autenticada encaminhada ao painel existente. |
| CSS global do destino para `main` e links | Neutralizado apenas nos CSS Modules do Cliente/conta, preservando estilos do painel e globals. |

Não houve conflitos textuais de merge: a integração foi seletiva sobre a main do destino. Os conflitos foram arquiteturais e de contrato, resolvidos acima. O painel administrativo existente (incluindo MVP-05 da equipe), suas ações, Auth MVP-01, RLS, migrations, configurações e backend foram mantidos sem alterações.

## Funcionalidades e rastreabilidade

- MVP-01: login, cadastro de Cliente e logout integrados ao serviço Auth existente; nomes/e-mail mantidos após erro, senha limpa após tentativa, opção Mostrar senha, estado de espera e mensagens de erro.
- MVP-03: formulário de abertura com limites do schema (150/5000/200), validação no servidor, preservação do preenchimento em falha, confirmação de descarte e link de acompanhamento após sucesso.
- MVP-04: detalhes próprios, prioridade, responsável, data, descrição e histórico real, incluindo observações. UUID inválido, inexistente ou inacessível produz a mesma ausência.
- MVP-05: listagem do Cliente com pesquisa por número/UUID/título/local, busca sem distinguir caixa/acentos, status, paginação de 20 itens e parâmetros mantidos. A lista do painel permanece intacta.
- Dashboard: total e indicadores por estado, cinco solicitações recentes, Sidebar/Header, navegação, componentes compartilhados, estados vazios/erro/carregamento e estilos responsivos transferidos.

Não há conector Trello disponível nesta sessão: não foram confirmados links, lista, atribuição, checklists nem critérios atuais dos cartões MVP. Os identificadores seguem o escopo solicitado e os contratos do destino; isto não declara os cartões aceitos ou concluídos no Trello.

## Limites da adaptação

A RPC do destino não tem chave de idempotência. O frontend bloqueia o botão durante o envio e após sucesso; em falha de resultado incerto, bloqueia reenvio naquela tela e orienta conferir a listagem. Não promete idempotência persistente entre recarregamentos/abas. O backend existente foi preservado.

A busca e os indicadores consultam o conjunto completo das solicitações próprias em lotes de 500, com ordenação estável por data e UUID; filtro e paginação são aplicados sobre esse conjunto, sem N+1 de detalhes. O custo cresce com o volume; consultas de agregação/busca no servidor podem otimizar uma entrega futura.

Não foram transferidos patrimônio opcional, backend antigo, documentos antigos como requisitos atuais, demos removidas, template Vite `fixit-frontend`, `.env` (inclusive o exemplo), credenciais, node_modules, `.next`, arquivos gerados ou temporários. As dependências foram instaladas novamente usando o lockfile do destino, sem scripts de instalação.

## Validação nesta transferência

Node 24.18.0 e npm 11.16.0, conforme o destino.

| Verificação | Resultado |
| --- | --- |
| `npm ci --ignore-scripts` | Passou após repetir devido a DNS/timeout; lockfile e package.json intactos. |
| `npm test` | 26 testes passaram (22 existentes e 4 novos). Dois testes existentes usam servidor HTTP local e exigiram execução fora do sandbox após EPERM. |
| `npm run lint` | Passou sem avisos. |
| `npm run typecheck` | Passou, incluindo geração de tipos de rotas. |
| `npx --no-install tsc --noEmit` | Passou. |
| `npm run build` | Passou com configuração pública fictícia local fornecida apenas no ambiente do comando. Nenhum .env criado/copiado. |
| Chrome headless em 1440×900 e 390×900 | Login, cadastro e acesso da equipe renderizados sem overflow horizontal; campos obrigatórios e validação nativa conferidos. |
| Navegação anônima em ambas as larguras | `/`, `/solicitacoes`, `/solicitacoes/nova` e detalhes encaminham a `/conta/entrar`. |
| Demos | `/demo/cliente` e `/demo/solicitacao` retornam 404. |
| `git diff --check` | Passou. |

O build inicial sem configuração falhou no login do painel existente, que requer as variáveis públicas de Supabase; a repetição usou URL loopback e chave publicável fictícia de validação, sem conectar a um backend real. O build aprovou todas as rotas novas e as rotas existentes do painel.

Os novos testes verificam leitura após 500 registros, autoria explícita em cada lote e detalhe, busca por localização/número e status combinado, tratamento de UUID inválido/ausente, falha versus lista vazia, limites de campos e exclusão de campos de gestão/autoria da entrada encaminhada.

**Pendente: validação autenticada com Supabase real.** Docker está sem daemon/socket e o checkout do destino não tem configuração própria de backend. Não foram copiados ambientes da origem nem alterados bancos locais/cloud. Ainda é necessário validar cadastro/login/logout reais, abertura persistida, erros de envio, indicadores e filtros com dados reais, isolamento entre Clientes e integração visual das telas autenticadas, além dos acessos de Gestor/Manutentor ao painel. Os testes atuais não substituem essa validação nem comprovam RLS no banco.

## Inventário completo para revisão

Arquivo modificado:

- `src/app/page.tsx`

Arquivos adicionados:

- `src/app/conta/actions.ts`
- `src/app/conta/cadastrar/page.tsx`
- `src/app/conta/entrar/page.tsx`
- `src/app/conta/form.module.css`
- `src/app/conta/form.tsx`
- `src/app/error.tsx`
- `src/app/loading.tsx`
- `src/app/solicitacoes/[id]/not-found.tsx`
- `src/app/solicitacoes/[id]/page.module.css`
- `src/app/solicitacoes/[id]/page.tsx`
- `src/app/solicitacoes/nova/actions.ts`
- `src/app/solicitacoes/nova/form.module.css`
- `src/app/solicitacoes/nova/form.tsx`
- `src/app/solicitacoes/nova/page.tsx`
- `src/app/solicitacoes/page.module.css`
- `src/app/solicitacoes/page.tsx`
- `src/components/cliente/Cards.module.css`
- `src/components/cliente/Cards.tsx`
- `src/components/cliente/ClienteLayout.module.css`
- `src/components/cliente/ClienteLayout.tsx`
- `src/components/cliente/Header.module.css`
- `src/components/cliente/Header.tsx`
- `src/components/cliente/Sidebar.module.css`
- `src/components/cliente/Sidebar.tsx`
- `src/components/cliente/TabelaChamados.module.css`
- `src/components/cliente/TabelaChamados.tsx`
- `src/components/cliente/linhas.ts`
- `src/lib/cliente/consultas.ts`
- `src/lib/cliente/dados.ts`
- `tests/cliente.test.mjs`
- `docs/transferencia-frontend-cliente.md` (este relatório)

Arquivos removidos do destino: **nenhum**.

## Publicação

Os commits são locais e organizados por funcionalidades. Nenhum push ou PR foi executado. O envio de `feat/frontend-cliente` depende de autorização expressa após a revisão deste inventário; não enviar diretamente à main nem usar force push.
