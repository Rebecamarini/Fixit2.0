# Validação — MVP-02

Cartão: https://trello.com/c/aTmY7Xk2. Implementação autorizada explicitamente pelo usuário via implement-spec em 2026-11-12.

## Entrega

Branch `integration/mvp-02-rls`. Spec versionada em `d2967f9`, implementação em `a6c0ea9`, merge sem conflitos em `26803d3`. Implementação feita em worktree própria baseada na integração, com TDD e integração final conferida. Nenhuma funcionalidade ou credencial da versão antiga foi importada.

Migration `20261112203635_mvp02_rls.sql`: leitura de solicitações/histórico/perfis por RLS e quatro operações autenticadas para abertura, transição, organização e observações. Escrita direta nas tabelas continua fechada. As operações usam identidade confiável, locks de perfil/solicitação, estados válidos e eventos atômicos. Rotinas privilegiadas ficam em schema privado; wrappers públicos são security invoker e grants são explícitos.

Contrato efetivo documentado em [mvp-02-integracao.md](mvp-02-integracao.md). Perfil inativo fica invisível até para a própria sessão; a integração Auth existente retorna `profile_missing` nesse caso, sem conceder acesso ao produto. Não foram adicionadas telas nem dependências.

## TDD e banco local

- Primeiro RED real: API retornou `PGRST202` porque a operação de abertura não existia. GREEN: abertura pela sessão Cliente e evento automático passaram; demais comportamentos foram acrescentados por ciclos incrementais.
- Migration criada pela CLI e iterada por SQL local; versão final reproduzida do estado anterior e registrada pela CLI. Listagem final local confirma as quatro versões, incluindo `20261112203635`.
- Suite real `rls:check local`: 227 verificações aprovadas na execução final; o número pode variar ligeiramente conforme o resultado válido das corridas.
- Smoke de API anterior: 24 verificações aprovadas, chamado também pelo runner de RLS. Autenticação real existente: 32 verificações aprovadas. Suite SQL de integridade existente aprovada.
- Advisors de segurança local: nenhum problema. Contagem final local: zero contas, identidades, sessões, perfis, solicitações e eventos.
- Durante iterações iniciais, a limpeza com triggers desabilitados deixou identidades de fixtures; o executor foi corrigido para restaurar triggers antes das cascatas Auth. Resíduos identificados pelo prefixo exato de teste foram removidos e a limpeza final foi conferida.

## Cloud v2

Projeto exclusivo `wvdqynbngsveqyzsphre`, com as três migrations anteriores conferidas antes da alteração. A mesma migration final foi aplicada. O MCP atribuiu inicialmente `20261112204432`; a entrada do histórico foi alinhada ao arquivo `20261112203635`, com as quatro versões conferidas.

`rls:check cloud`: 227 verificações reais aprovadas, incluindo o smoke anterior da API. A preparação privilegiada usou um helper SQL temporário fora do repositório, com entrada/saída privadas; as operações testadas usaram chave publicável e login Auth real. Nenhuma chave administrativa foi necessária no runner.

A primeira tentativa foi interrompida por um erro de leitura das respostas do conector no adaptador SQL temporário. O adaptador foi corrigido; contas da tentativa foram limpas e a execução completa passou. Não houve alteração de código de produto para contornar a falha do adaptador.

Cobertura: três papéis, visitante, outro Cliente/Manutentor, perfil ausente/inativo com sessão válida, visibilidade de perfis relacionados, metadados/identidade forjados, escrita direta, transições indevidas, estados terminais, reatribuição e perda de acesso, observações imutáveis, eventos automáticos e ausência de eventos sem mudança. Uma restrição temporária limitada à solicitação de teste provocou falha real de evento e comprovou rollback da mudança. Corridas reais pela API exercitaram reatribuição/início e conclusão/observação, com resultados compatíveis com execução serial e histórico ordenado.

Advisors de segurança cloud: nenhum achado. Limpeza SQL final: zero contas, identidades, sessões, perfis, solicitações e eventos. O executor também confere refresh tokens de fixtures e remove a restrição temporária. Nenhuma credencial integra Git ou este relatório.

## Código e revisão

- `npm run verify` na raiz da integração: 11 testes, lint sem avisos, tipos e build Next aprovados. Build final contém somente página inicial, não encontrado e proxy; não há tela técnica nova.
- A worktree usava symlink de dependências, recusado pelo Turbopack; o build aprovado ocorreu na raiz com dependências locais.
- Revisões independentes sobre `git diff main...26803d3`: Standards — zero achados; Spec — zero achados. Foram revisados autorização, grants, escopo privado das rotinas, visibilidade, inativação, atomicidade e concorrência.
- `git diff --check` aprovado.

## Limites

A validação usa a API real, conforme decisão da entrevista; não foram criadas telas para testes de navegador. A suite antiga completa de Auth foi repetida localmente; no cloud, a suite de RLS verifica login real das cinco fixtures e autorização, sem repetir integralmente a suite antiga de sessão/logout. As corridas são testes de comportamento, não prova formal de todas as escalas e escalonamentos possíveis.

As RPCs produzem eventos das operações da aplicação; manutenção administrativa direta permanece explícita e fora desse contrato. A integração mínima com histórico foi entregue neste cartão; o cartão separado de persistência não é automaticamente considerado concluído.
