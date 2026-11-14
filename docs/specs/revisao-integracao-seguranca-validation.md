# Validação — integração e segurança do backend

Cartão: https://trello.com/c/a6qjxn8S. [Spec](revisao-integracao-seguranca.md).

Execução autorizada separadamente em 2026-11-13 via `implement-spec`, na branch `integration/revisao-integracao-seguranca`. Base do produto: `04d9028060d4a4c40f17cbc03959a99b56967c69`; spec inicial `4567168`.

## Resultado e alterações

O contrato existente fornece as operações obrigatórias para os dois frontends do MVP. A revisão acrescenta evidências de sessão no Next.js real e de consultas com filtros/paginação, e corrige orientações desatualizadas do README. Nenhuma alteração de regra, migration, RPC ou tela foi necessária.

O novo `auth:check-next` cria um app temporário fora do produto, copia os módulos reais de `src/lib`, o proxy e a configuração Next.js, e executa build de produção e servidor em loopback com navegador Chromium real. Os handlers e páginas de teste são removidos ao terminar e nunca integram as rotas do produto. A ferramenta Playwright é fornecida pelo operador por caminho explícito; não há nova dependência de runtime.

## Matriz de operações e evidências

| Requisito/fluxo | Interface pública consumida pelas telas | Evidência nova |
| --- | --- | --- |
| Cadastro válido, inválido e duplicado | `createAuth(client).signUp` / Auth público | `auth:check` local/cloud: Cliente ativo, vínculo único, duplicidade, limites e senha do provedor |
| Cadastro atômico e privilégios | Auth público; provisionamento administrativo existente | Falha real do perfil sem conta órfã, nova tentativa, metadados forjados sem privilégio e criação de Gestor/Manutentor com papel correto |
| Login e contexto dos três papéis | `signIn` e `context` | `auth:check`: credenciais válidas/inválidas, perfil ausente/inativo; testes unitários complementam entradas inválidas e indisponibilidade |
| Sessão no Next.js | Cliente browser, servidor, proxy, Route Handler e Server Component | `auth:check-next` local/cloud: cookie persistente, novo contexto do navegador, identidade compartilhada entre browser/servidor, renovação real com rotação de refresh token, logout nos dois sentidos e sessão revogada |
| Isolamento de respostas | Requisições HTTP ao Next.js de produção | Respostas `private, no-store`; contexto anônimo permanece desconectado após outro usuário autenticar |
| Listas, detalhes e filtros | Data API `solicitacoes.select`, filtros por status/ID, contagem e `range` | `rls:check`: Cliente próprias, Gestor todas, Manutentor atribuídas; ID conhecido de terceiro não revela dados; páginas e contagens não ultrapassam RLS |
| Pessoas necessárias | Data API `profiles.select` | Próprio perfil, solicitante, responsável e autores históricos; seleção de Manutentores ativos; ausência de diretório geral |
| Abertura | `abrir_solicitacao` | Cliente para si, campos válidos, Pendente e evento inicial; equipe/visitante e solicitante forjado recusados |
| Triagem | `transicionar_solicitacao` | Gestor aprova/descarta Pendente; outras combinações recusadas |
| Prioridade e atribuição | `organizar_solicitacao` | Par completo, valores válidos, remoção somente quando permitida, responsável ativo, reatribuição e perda de acesso do anterior |
| Atendimento | `transicionar_solicitacao` | Responsável atual inicia/conclui, pré-condições obrigatórias, nenhum retorno/reabertura ou mutação terminal |
| Histórico e observações | `historico.select` e `adicionar_observacao` | Histórico completo autorizado, ordenação por data/ID, nove eventos com payload/autoria/data, observações e referências antigas preservadas; edição/exclusão recusadas |
| Integridade e concorrência | Mesmas RPCs autenticadas | Rollback ao falhar evento de status ou segundo evento de organização, ausência de evento em operação sem diferença, corridas reatribuição/início e conclusão/observação |
| Segurança contra chamadas diretas | Auth, Data API e RPC com chave publicável | Visitante, perfis ausentes/inativos, DML direto, schema privado, papéis/metadados/autor/data forjados e ações incompatíveis recusados |

`auth:check` e `rls:check` usam o Auth real; SQL privilegiado prepara/confere/limpa fixtures e induz falhas controladas. O smoke `db:check-api` é executado dentro da suite RLS com token real, não com chave administrativa. A suite SQL de integridade é complementar.

## Reconciliação com os cartões de frontend

Foram conferidos os cartões atuais nas listas Sprint Final, distinguindo-os dos registros históricos. Cadastro/login, abertura/lista/detalhe do Cliente, listas/filtro da gestão, aprovação/descarte, prioridade/atribuição e atendimento/observações possuem interfaces no contrato atual.

Os cartões de formulário/lista do Cliente ainda mencionam categoria. A decisão posterior em [tabelas-principais.md](tabelas-principais.md), seção Conteúdo da solicitação, exclui categoria; a revisão preserva essa regra conforme a entrevista. “Assunto” nas telas corresponde a `titulo`. Não criar campo ou requisito de categoria a partir desse checklist anterior. Responsividade, confirmações visuais, estado vazio e atualização da apresentação continuam nos cartões de frontend; o backend retorna as listas/erros necessários. Patrimônio continua opcional.

## Revisão de migrations, código e estado efetivo

Local e cloud possuem as quatro versões `20261110224700`, `20261111201148`, `20261111231601` e `20261112203635`. Leitura dos catálogos confirmou:

- As três tabelas públicas têm RLS habilitada; `anon` não tem SELECT e `authenticated` tem SELECT, sem INSERT/UPDATE/DELETE/TRUNCATE direto.
- As três políticas de leitura são para `authenticated` e consultam os helpers de visibilidade próprios. Não há política pública permissiva de escrita.
- As quatro RPCs públicas são `security invoker`, executáveis somente por `authenticated`. `setup_healthcheck` é a exceção pública intencional: devolve apenas o marcador técnico, sem ler dados do produto.
- Implementações privilegiadas ficam em `private`, com `search_path` vazio, permissões explícitas e autorização por perfil atual no banco. Helpers exclusivos de trigger/operação não têm EXECUTE para os papéis comuns. `anon` não tem USAGE em `private`; nenhum papel comum tem CREATE em `public`/`private`.
- Não há views públicas que contornem RLS. Clientes usam chave publicável, configuração rejeita chave administrativa antes de gerar bundle, cliente servidor é `server-only`, identidade vem de Auth validado e papel/atividade vêm de `profiles`, sem autorização por metadados editáveis.
- RPCs bloqueiam solicitação e revalidam autorização; inativação do operador conflita com lock compartilhado do perfil; evento e alteração são transacionais. Manutenção SQL administrativa permanece fora dessa geração automática de eventos, conforme o contrato aprovado.

As definições efetivas foram comparadas por agregação ordenada de `pg_get_functiondef`, `pg_policies`, `pg_get_constraintdef` e `pg_get_triggerdef`, nos schemas da aplicação (e trigger Auth próprio), com fingerprints iguais em local e cloud:

| Grupo | MD5 da definição agregada |
| --- | --- |
| Funções | `a02488e415c7168133c9af219f3dd43c` |
| Políticas | `7cef1a9cafd32f4f3830fc1465eff806` |
| Constraints | `ff4b4dd81b7d758b6fa5f9abf48c027a` |
| Triggers | `b68dcca09000fab2daf9fcf316698c3e` |

Isso detecta divergência entre esses objetos, não substitui testes de comportamento nem cobre toda configuração da plataforma. Constraints temporárias das fixtures são excluídas da comparação. O advisor de segurança cloud retornou lista vazia. As referências consultadas incluem [SSR e cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), changelog atual do Supabase e documentação instalada de Next.js 16.4.2.

`npm audit --omit=dev` retornou zero vulnerabilidades conhecidas nas dependências de produção. A auditoria completa apontou sete entradas moderadas da mesma cadeia de desenvolvimento, originadas em `minimatch` 10.2.6, usado pelo parser TypeScript do ESLint: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), amplificação de glob com potencial de negação de serviço. Não foi demonstrado caminho a partir de requisições do produto; a aplicação não aceita globs para o linter. Registrado como manutenção das ferramentas de desenvolvimento, sem atualização automática da stack fixada nem declaração de que o risco inexiste em ferramentas que processem padrões não confiáveis.

## Execuções novas e reprodução

- `auth:check local` e `auth:check cloud`: **32 verificações por ambiente**, com limpeza confirmada.
- `auth:check-next local` e `auth:check-next cloud`: **25 verificações por ambiente**, app temporário removido e fixtures conferidas.
- `rls:check local` e `rls:check cloud`: **277 verificações por ambiente** na cobertura ampliada inicial, limpeza confirmada. A versão final inclui também paginação descendente (mais recentes primeiro): **285 verificações locais** e **287 cloud** aprovadas, com limpeza. A variação decorre da ordem válida das operações concorrentes, que pode exigir um início posterior pelo novo responsável.
- Suite `supabase/tests/tabelas-principais.sql` local com `ON_ERROR_STOP=1`: aprovada, encerrada por `ROLLBACK`.

Executar os comandos com Node 24.18.0/npm 11.16.0 e os arquivos ignorados `.env.supabase.local`/`.env.supabase.cloud`. Ver o README para `FIXIT_AUTH_SQL_COMMAND`, chave administrativa restrita ao runner Auth e caminhos de Playwright/navegador para o runner Next. Nenhuma credencial pertence a este relatório. O bridge SQL cloud é mecanismo temporário de preparação/limpeza pelo conector, não endpoint do aplicativo.

## Limites e ocorrências da execução

- A reabertura é comprovada por novo contexto Chromium restaurando cookies persistidos; não depende de manter o cliente em memória. A renovação antecipa o vencimento armazenado no cookie, preservando JWT assinado/refresh token real; não espera uma hora de expiração natural. Revogação definitiva é testada antes da tentativa de renovação.
- Logout local remove cookies e a capacidade de renovação da sessão atual; não promete invalidar instantaneamente todos os JWTs já emitidos. Outro dispositivo permanece autenticado conforme o contrato.
- O serviço de agentes reiniciou durante testes cloud. Os processos terminaram e a ausência de fixtures foi conferida; como o stdout foi perdido, RLS e Next cloud foram executados novamente com logs privados em arquivo. Os números apresentados acima vêm das execuções novas com resultado disponível.
- Uma tentativa local do executor RLS falhou na comparação da ordem do histórico antes dos novos testes de consulta. O diagnóstico detalhado se perdeu no reinício; a execução seguinte passou sem alterar código de produto nem enfraquecer a asserção. Não atribuir causa ao relógio ou ao banco sem evidência. A ocorrência não foi reproduzida na execução registrada; permanece uma limitação diagnóstica desta revisão.
- O primeiro `verify` no worktree usou symlink de `node_modules` externo, e Turbopack recusou a resolução fora da raiz. Esse arranjo de teste foi substituído por instalação própria, sem alterar configuração do produto.
- Não foram implementadas nem aceitas as telas finais. Não há declaração de prova formal de segurança ou de todos os escalonamentos concorrentes possíveis.

## Revisão final

Resultados da integração, revisão independente e limpeza final serão registrados após concluir os checks.
