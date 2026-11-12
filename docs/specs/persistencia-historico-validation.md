# Validação — persistência e histórico

Cartão: https://trello.com/c/5rZFakvy. Spec: [persistencia-historico.md](persistencia-historico.md).

Implementação autorizada pelo usuário via `implement-spec` em 2026-11-12. Worktree `work/persistencia`, criada a partir da integração `integration/persistencia-historico` em `def91f9`.

## Resultado

A implementação existente de tabelas principais e MVP-02 atende aos requisitos de produto deste cartão. Não foi necessária mudança de schema, RPC, regra de negócio ou frontend. A entrega completa lacunas de evidência no executor de integração existente e valida novamente o contrato pela API real nos dois ambientes da v2.

## Matriz do cartão

| Requisito | Implementação existente | Verificação atual |
| --- | --- | --- |
| Garantir valores válidos de status | Enum de status, restrições de integridade e RPC de transição com autorização | RPC com status fora do domínio retorna `22P02`, preservando estado e histórico; fluxo permitido e recusas por papel/estado; suite SQL de integridade local |
| Gravar alterações no histórico | Abertura, transição e organização acrescentam eventos na transação; observações autorizadas somente de acréscimo | Comparação completa dos nove eventos de um fluxo real: abertura, três transições, duas mudanças de prioridade, duas de responsável e uma observação; ausência de evento na organização sem diferença; imutabilidade de evento existente |
| Registrar autor e data | Operador vem da sessão e perfil ativo; datas vêm do banco, após locks; API não recebe autor/data | Autor, vínculo, data válida/atual e campos anteriores/novos conferidos nos eventos do fluxo; parâmetros forjados recusados; observações com autoria correta |
| Validar integridade e transições | Restrições de campos/vínculos, matriz de autorização, locks e transações atômicas | Estados terminais, inativação, reatribuição, campos obrigatórios, chamadas diretas, duas corridas reais; falha de evento de status desfaz transição; falha do segundo evento da organização desfaz ambos os campos e o primeiro evento |

## Lacunas de cobertura fechadas

O executor já comprovava o fluxo, autorização, atomicidade de status e concorrência. Faltava conferir explicitamente pela API o enum de status inválido sem efeitos, o conteúdo completo dos pares anteriores/novos de todos os tipos de evento, autoria/data/vínculo em todo o fluxo e o rollback quando a organização falha ao registrar seu segundo evento. As tentativas de edição/exclusão agora também apontam para o identificador de uma observação real, com conferência de preservação do conteúdo original.

As verificações acrescentadas passaram sobre a implementação existente. Não houve ciclo RED/GREEN de correção de produto: são testes de caracterização de comportamentos já entregues, sem alteração artificial para provocar um RED. Nenhuma abstração, dependência ou executor paralelo foi criado.

## Execuções novas — 2026-11-12

- `npm run rls:check -- local`: **244 verificações reais aprovadas**, com chave publicável e sessões Auth reais. Fixtures removidas e conferidas pelo runner.
- `npm run rls:check -- cloud`: **245 verificações reais aprovadas** no projeto v2 `wvdqynbngsveqyzsphre`. Fixtures removidas e conferidas pelo runner.
- A diferença de contagem é esperada: a corrida reatribuição/início pode exigir uma operação posterior do novo responsável, conforme a ordem válida observada.
- Suite SQL `supabase/tests/tabelas-principais.sql` executada no PostgreSQL local com `ON_ERROR_STOP=1`: todos os blocos aprovados e `ROLLBACK` final, sem fixtures persistidas.
- O smoke existente da API é executado pelo runner de RLS nos dois ambientes. Evidências anteriores do MVP-02 permanecem em seu relatório; estes resultados são execuções novas, não reapresentação das contagens antigas.

Para repetir, usar os comandos `rls:check` existentes com `FIXIT_AUTH_SQL_COMMAND` apontando para helper privilegiado confiável que recebe SQL por stdin e devolve array JSON. Configuração de ambiente permanece em arquivos ignorados. O helper só prepara, induz falhas controladas e limpa fixtures; ações do produto passam pela Data API/RPC autenticada. Os helpers temporários utilizados não fazem parte do contrato versionado nem contêm credenciais neste relatório.

A primeira tentativa local dentro do sandbox não acessou Docker e terminou antes de preparar contas; a execução autorizada seguinte passou, incluindo conferência de limpeza. O cloud usou o conector SQL por fila temporária para preparar/limpar as fixtures, sem chave administrativa no runner.

## Limites

Histórico obrigatório cobre operações da aplicação. Manutenção administrativa direta continua fora da geração automática de eventos, conforme a decisão da spec. Não foram criadas telas, não houve nova migration e não foi alterado o cartão separado de revisão de integração e segurança. Corridas exercitadas são evidência de comportamento, não prova formal de todos os escalonamentos possíveis. A conferência de datas permite até 60 segundos de diferença entre relógios do executor e banco.

## Integração e revisão final

Spec versionada em `def91f9`; testes e evidências em `ed93cfe`; merge sem conflitos em `e459c36`, na branch `integration/persistencia-historico`.

`npm run verify` na raiz da integração aprovado: 11 testes, lint sem avisos, tipos e build. A primeira tentativa no sandbox falhou em dois testes ao abrir servidor local (`listen EPERM`); a execução autorizada fora do sandbox passou integralmente. `git diff --check` aprovado.

Revisões independentes sobre `git diff main...e459c36`: Standards — zero achados; Spec — zero achados acionáveis. Não houve correção posterior de produto. A entrega permanece local nesta branch, sem push ou PR nesta execução.
