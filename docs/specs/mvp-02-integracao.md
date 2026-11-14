# MVP-02 — Contrato para os frontends

Cartão: https://trello.com/c/aTmY7Xk2. Regras completas na spec MVP-02.

Usar o cliente Supabase autenticado existente, com a chave publicável e a sessão da pessoa. As consultas passam por RLS e as escritas usam as quatro operações abaixo. Não há INSERT, UPDATE ou DELETE direto da aplicação nas três tabelas. Nenhuma chave administrativa é necessária no frontend.

## Consultas

- `solicitacoes`: Cliente vê as próprias; Gestor vê todas; Manutentor vê somente as atualmente atribuídas. Usar filtros, ordenação e paginação normais da Data API. Um identificador fora do acesso retorna lista vazia.
- `historico`: filtrar `solicitacao_id` e ordenar por `created_at`, depois `id`. O acesso acompanha a solicitação e inclui eventos/observações anteriores à atribuição atual.
- `profiles`: próprio perfil, solicitante, responsável e autores/referências históricas das solicitações visíveis. Gestor também consulta Manutentores ativos para seleção, filtrando `papel = manutentor` e `ativo = true`. Isso não abre um diretório geral de pessoas. Perfis relacionados inativos continuam identificáveis pelas outras pessoas autorizadas, preservando o histórico.
- Reatribuição remove imediatamente o acesso do antigo responsável nas próximas operações, inclusive ao histórico. O novo responsável recebe o histórico completo.
- Sessão sem perfil ou com perfil inativo recebe listas vazias em todas as tabelas. O contexto de autenticação existente passa a devolver `profile_missing` também quando o perfil está oculto por inativação; tratar como ausência de acesso ao produto. Uma sessão Auth válida não garante autorização.
- Visitante não tem SELECT nas tabelas de negócio; a consulta técnica de setup continua disponível.

## Escritas

Todas as RPCs retornam um objeto de registro em `data`, ou `error` sem alteração parcial. Os parâmetros são obrigatórios, inclusive quando admitem `null`.

| RPC | Parâmetros | Retorno e autorização |
| --- | --- | --- |
| `abrir_solicitacao` | `p_titulo`, `p_descricao`, `p_local`: textos | Solicitação criada para o Cliente autenticado, Pendente, sem prioridade/responsável. |
| `transicionar_solicitacao` | `p_id`: UUID; `p_status`: estado de destino | Solicitação atualizada. Gestor: Pendente → Aprovada ou Descartada. Responsável atual: Aprovada → Em atendimento; Em atendimento → Concluída. |
| `organizar_solicitacao` | `p_id`: UUID; `p_prioridade`: `baixa`, `media`, `alta` ou `null`; `p_responsavel_id`: UUID ou `null` | Solicitação atualizada. Só Gestor em Aprovada ou Em atendimento. Enviar o par completo desejado; `null` remove o valor, respeitando as restrições do estado. |
| `adicionar_observacao` | `p_id`: UUID; `p_observacao`: texto | Evento do histórico. Gestor ou responsável atual, antes de Concluída/Descartada. Cliente não comenta. |

Estados persistidos: `pendente`, `aprovada`, `em_atendimento`, `concluida`, `descartada`. Em atendimento exige prioridade e responsável; ambos permanecem obrigatórios na conclusão. Nova atribuição exige Manutentor ativo. Em Aprovada, campos de organização podem ser definidos ou removidos separadamente enviando o outro valor atual.

O relato (título, descrição, local), solicitante, identificadores e datas não são editáveis após a abertura. Perfis não são editáveis pela aplicação. Ativação/desativação permanece no procedimento técnico autorizado. Não há reabertura nem exclusão.

## Histórico e erros

Abertura e mudanças de estado/prioridade/responsável geram seus eventos dentro da mesma transação da operação. Alteração de dois campos gera dois eventos, ambos com autor e valores anteriores/novos. Organização sem diferença não gera eventos. Autor e datas vêm do banco, sem parâmetros editáveis; timestamps são obtidos após os locks, preservando a ordem real das operações concorrentes. Observações e eventos existentes não podem ser editados ou apagados.

- `42501`: acesso/ação não autorizados, inclusive perfil inativo/ausente, solicitação inacessível ou ação incompatível com o estado. Reconsultar o estado e apresentar mensagem de ação indisponível.
- `23514`: entrada ou combinação de campos viola o contrato (limites, texto vazio, responsável inválido/inativo ou ausência de prioridade/responsável exigidos).
- `23502`: campo obrigatório nulo; `22P02`: enum/UUID inválido. Corrigir os parâmetros.
- `PGRST202`: assinatura inexistente, parâmetro extra ou contrato ainda não aplicado. Não confundir com autorização.
- Falhas de rede/serviço devem ser tratadas separadamente. Após resposta perdida, reconsultar a solicitação antes de repetir uma ação. Observações não têm chave de idempotência; uma repetição explícita é um novo registro.

Rotinas privilegiadas ficam no schema privado, com `search_path` vazio e permissões explícitas; wrappers públicos são `security invoker`. Só as operações estreitas autorizadas são acessíveis. Todas revalidam a pessoa ativa e bloqueiam a solicitação antes de alterar estado, responsabilidade ou observações; a inativação concorre com um lock compartilhado do perfil. Acesso administrativo direto continua sendo manutenção explícita, fora do contrato da aplicação e da geração de eventos dessas RPCs.

## Exemplos para integrar as telas

Usar `client` criado por `createBrowserSupabaseClient()` no navegador ou por
`await createServerSupabaseClient()` no servidor. Ambos carregam a sessão atual;
não enviar papel, solicitante, autor ou data como parâmetros de autorização.

```ts
// Cadastro/login/logout e contexto compartilham o cliente autenticado.
const auth = createAuth(client);
const contexto = await auth.context();
// Sucesso: { ok: true, user: { id, email }, profile: { id, nome, papel, ativo, created_at } }
// Sem sessão: { ok: false, error: "not_authenticated" }

// Lista mais recente primeiro; RLS aplica o acesso do papel atual.
const lista = await client.from("solicitacoes")
  .select("id,numero,titulo,local,status,prioridade,responsavel_id,created_at", { count: "exact" })
  .eq("status", "aprovada")
  .order("created_at", { ascending: false }).order("id", { ascending: false })
  .range(0, 19);
// Sucesso: { data: [...], count: totalVisivel, error: null }; lista vazia é válida.

const abertura = await client.rpc("abrir_solicitacao", {
  p_titulo: "Lâmpada apagada", p_descricao: "Não acende ao ligar", p_local: "Sala 1",
});
// Sucesso: data contém a solicitação persistida em status "pendente".

// Gestor usa um ID obtido da lista/detalhe autorizado.
const aprovacao = await client.rpc("transicionar_solicitacao", {
  p_id: solicitacaoId, p_status: "aprovada",
});
const organizacao = await client.rpc("organizar_solicitacao", {
  p_id: solicitacaoId, p_prioridade: "alta", p_responsavel_id: manutentorId,
});
// Organizar envia sempre os dois valores desejados. Recusa: error.code "42501"
// para ação não autorizada; "23514" para combinação inválida (ver tabela de erros).

const historico = await client.from("historico").select("*")
  .eq("solicitacao_id", solicitacaoId).order("created_at").order("id");
// data inclui os eventos anteriores; [] também pode significar ID fora do acesso.
```

`createAuth` é importado de `src/lib/auth.ts`; os identificadores dos exemplos
são valores do fluxo da tela. Tratar `error` antes de afirmar sucesso e consultar
novamente após mutações para atualizar a apresentação. “Assunto” corresponde a
`titulo`; categoria foi excluída do MVP pela spec de tabelas principais.

## Validação reproduzível

`npm run rls:check -- local` ou `npm run rls:check -- cloud`, com configuração ignorada do ambiente escolhido e `FIXIT_AUTH_SQL_COMMAND` apontando para um helper privilegiado confiável que recebe SQL por stdin e retorna um array JSON (consultas) ou `[]` (mutações). O runner não precisa de chave administrativa: SQL prepara contas/identidades isoladas e o teste entra pelo Auth público real.

O helper precisa executar transações, preparar/limpar fixtures e adicionar/remover uma restrição temporária restrita a uma solicitação de teste para provocar falha real do evento. A preparação nunca substitui as operações autenticadas testadas. A limpeza desliga triggers somente na sessão/transação de manutenção durante a remoção do histórico de teste e restaura o modo normal antes de remover os outros registros, preservando cascatas Auth. O runner confere ausência de contas, perfis, identidades, sessões e refresh tokens das fixtures ao finalizar.

A suite cobre matriz de leitura/escrita, chamadas diretas, campos forjados, metadados públicos, perfis inativos/ausentes, transições, terminais, reatribuição, auditoria, rollback e corridas entre reatribuição/início e conclusão/observação. Testes de autenticação e integridade existentes permanecem complementares.
