# Evidências — tabelas principais

Data: 2026-11-11. Cartão: https://trello.com/c/vrIpSvNe.
Branch: `integration/tabelas-principais`.

## Entrega

- Migration `20261111201148_tabelas_principais.sql`: profiles, solicitacoes e historico, enums, FKs restritivas, limites de texto, número sequencial, validações de papel/atividade e combinação de estado, preservação de autoria e histórico imutável.
- Funções de integridade em schema privado, `security invoker`, `search_path` fixado e execução pública revogada. Nenhuma função privilegiada ou endpoint novo.
- RLS habilitada nas três tabelas e privilégios de anon/authenticated revogados. Políticas do produto e geração automática de eventos permanecem nos cartões próprios.
- Implementação no commit `d3eb602`; correção do teste de API em `6796b42`; integração final de código em `705ccd7`.

## Banco real

| Verificação | Local | Cloud v2 |
| --- | --- | --- |
| Suite SQL transacional, com casos positivos e negativos | Aprovada | Aprovada |
| 24 operações reais da API com anon e authenticated | Aprovadas | Aprovadas |
| RPC técnica de setup | `fixit-v2:ok` | `fixit-v2:ok` |
| Versão registrada no histórico | `20261111201148` | `20261111201148` |

Local: contexto Docker `colima-fixit-validation`, banco `supabase_db_fixit-v2`. O desenvolvimento seguiu ciclos RED→GREEN por tabela com SQL direto. A migration completa também foi reproduzida dentro de transação, recriando somente os objetos novos e executando a suite, seguida de rollback. O histórico foi registrado com `migration repair --local --status applied` após a confirmação do schema e da reprodução integral, sem reset dos dados existentes.

Cloud: projeto exclusivo `wvdqynbngsveqyzsphre`. Aplicação pelo conector Supabase; o MCP atribuiu inicialmente versão `20261111201753`, alinhada à versão do arquivo após aplicação. A suite SQL completa executou com sucesso e rollback. Consultas posteriores confirmaram zero linhas nas três tabelas de negócio.

Os testes cobrem referências inexistentes, valores e papéis inválidos, campos vazios/limites, atribuição a inativos, preservação dos vínculos após desativação, proibição de alterar identidade/autoria, combinações de estado, eventos incompatíveis, exclusões restritas e imutabilidade do histórico inclusive com service_role. Nenhum teste depende de detalhes internos dos triggers.

As verificações HTTP exigiram erros explícitos de permissão/não exposição para todas as operações; respostas vazias de sucesso não contam como bloqueio. Sessões Auth reais e temporárias foram provisionadas sem envio de e-mail, usadas no ambiente correspondente, encerradas globalmente (HTTP 204) e suas contas removidas. Nenhuma fixture de negócio persiste; lacunas da sequência são esperadas. Tokens e credenciais temporários permaneceram fora do Git e foram removidos após os testes.

## Revisão e verificações do repositório

- `npm run verify`: nove testes, lint, tipos e build aprovados após integração.
- Correção posterior limitada ao verificador de API e README: 24 operações locais e 24 cloud aprovadas novamente; lint aprovado.
- `git diff --check`: aprovado.
- Code-review Standards: nenhum achado. Spec: um achado de falso positivo no teste da API corrigido e reavaliado sem pendências.

## Advisors e limites de escopo

Advisors locais não apontaram problemas. No cloud, as informações sobre RLS sem políticas correspondem ao fechamento deliberado até o MVP-02; índices ainda não utilizados correspondem ao banco novo sem carga de produto. Não foram identificados avisos ou erros nas tabelas ou funções entregues.

O advisor cloud também informou proteção contra senhas vazadas desabilitada no Auth. Essa configuração de autenticação não é alterada por esta migration e deverá ser avaliada no MVP-01, respeitando o plano gratuito. Referências: [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

A entrega cria e protege a estrutura. Não entrega login, telas, políticas por papel, transições completas nem gravação automática do histórico.
