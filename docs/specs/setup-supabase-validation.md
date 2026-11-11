# Evidências — setup Supabase

Data: 2026-11-10. Cartão: https://trello.com/c/cMgHVTuv

## Infraestrutura

- Projeto cloud novo: `fixit-v2`, ref `wvdqynbngsveqyzsphre`, organização `Junior's Org`, região `sa-east-1`. Organização Free; cotação de criação US$ 0/mês.
- Supabase local da v2 iniciado e saudável no contexto Docker `colima-fixit-validation`, com API em `127.0.0.1:55321` e PostgreSQL em `55322`. Serviços do projeto antigo preservados nas portas próprias.
- Configurações reais local/cloud e configuração ativa gravadas apenas em arquivos ignorados pelo Git, com chaves publicáveis. Configuração ativa final: cloud.
- Migration `20261110224700_setup_healthcheck.sql` aplicada nos dois ambientes. O MCP cloud gerou inicialmente outra versão para o mesmo SQL; a única entrada do histórico cloud foi alinhada à versão do arquivo. Listagens local e cloud confirmaram `20261110224700`.

## Consultas e segurança

- Comando de verificação via SDK: local e cloud retornaram conexão e consulta confirmadas.
- RPC `setup_healthcheck()` retornou `fixit-v2:ok` nos dois ambientes com chave publicável.
- Consultas ao catálogo confirmaram `security invoker`, `search_path` vazio e permissão de execução para `anon`/`authenticated`, sem concessão a `PUBLIC`.
- Advisors de segurança: nenhum problema no local ou cloud.

## Next.js e navegador real

Uma página temporária importou os clientes reais, consultou a RPC em Server Component e em um efeito do Client Component. O servidor Next.js foi iniciado separadamente para cada configuração; o Safari acessou a página nos dois casos.

| Ambiente | Server Component | Safari / Client Component |
| --- | --- | --- |
| Cloud | `fixit-v2:ok` | `fixit-v2:ok` |
| Local | `fixit-v2:ok` | `fixit-v2:ok` |

A página temporária foi removida após a validação; nenhum endpoint ou tela técnica faz parte do produto. Os clientes continuam sem suporte a sessão por decisão de escopo; o aviso de múltiplas instâncias do SDK no modo estrito de desenvolvimento não impediu as consultas.

## Verificação final do código

Concluída na branch `integration/setup-supabase`:

- `npm run verify`: nove testes, lint, tipos e build aprovados.
- Revisão Standards: nenhum achado. Revisão Spec: um achado de segurança corrigido e reavaliado sem pendências.
- O preflight do Next.js bloqueia chaves privilegiadas antes da compilação ou do serviço de código cliente. A regressão executa builds reais com valores sentinela de chave secreta e `service_role`, confirmando falha antes de gerar o bundle e sem imprimir os valores.
- O build final contém somente a página inicial e a página padrão de não encontrado; nenhuma rota técnica permaneceu.
- `git diff --check`: aprovado.
