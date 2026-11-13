# Revisão de integração e segurança do backend

Cartão: https://trello.com/c/a6qjxn8S

Status: entrevista consolidada em 2026-11-12. Implementação e execução de testes ainda não autorizadas; aguardar pedido claro e separado.

## Decisões confirmadas — 2026-11-12

- Validar o backend completo necessário às telas do MVP, embora as telas ainda não estejam prontas. O aceite deste trabalho não depende de implementar as telas.
- Mapear cada fluxo previsto para as operações reais disponíveis e seus testes. Operações ausentes são lacunas desta tarefa, mesmo quando não constarem do contrato atual.
- Usar a integração Supabase existente: Auth, Data API/RPC e clientes compartilhados, incluindo os contextos de sessão usados por navegador e servidor. Não exigir uma API própria Next.js.
- Exigir novas execuções completas em local e cloud exclusivos da v2, com fixtures isoladas e limpeza conferida. Evidências anteriores são referência, não substituem a execução atual.
- Comprovar o ciclo de sessão no Next.js real, usando estrutura mínima de teste sem depender das telas finais. Exercitar clientes, cookies e proxy; o adaptador de cookies em memória não basta para esse aceite.
- Falhas que impeçam fluxos obrigatórios ou permitam acesso indevido bloqueiam o aceite até correção e novo teste. A execução futura inclui corrigir lacunas demonstradas. Melhorias opcionais ficam separadas.
- Preservar as regras aprovadas: Cliente solicita para si; Gestor organiza; Manutentor atende solicitações atribuídas; papel fixo; perfil inativo sem acesso ao produto. Conflitos ou mudanças de negócio exigem nova decisão do usuário.

## Cobertura a detalhar

Cadastro de Cliente, login dos três papéis, contexto e ciclo da sessão, logout, consultas de perfis/solicitações/histórico, abertura, triagem, prioridade, atribuição, início e conclusão do atendimento e observações. Conferir operações permitidas e recusadas, RLS, integridade, histórico, migrations e código que sustentam esses fluxos.

Usar CONTEXT.md, ADR 0001 e contratos aprovados como base; registros da versão antiga não representam implementação nem requisitos automaticamente aplicáveis. Patrimônio permanece opcional.

## Evidências disponíveis para orientar a revisão

- `mvp-01-autenticacao.md` e relatório associado: contrato de autenticação.
- `mvp-02-integracao.md` e `mvp-02-rls.md`: consultas e quatro RPCs autenticadas, matriz por papel e restrições.
- `persistencia-historico-validation.md`: validações anteriores de integridade, histórico, rollback e concorrência.
- `scripts/check-auth.mjs`: usa adaptador de cookies em memória com Auth real; isso precisa ser distinguido da execução efetiva dos clientes Next.js e proxy.

## Matriz obrigatória da revisão

| Fluxo | Comprovação esperada |
| --- | --- |
| Cadastro | Cliente ativo, vínculo Auth/perfil atômico, validação e duplicidade; recusa de papel/atividade forjados |
| Login e contexto | Três papéis, credenciais incorretas, visitante, perfil ausente/inativo e falha de serviço distinguíveis |
| Sessão no Next.js | Cookies efetivos, persistência entre contextos de navegador, renovação, expiração e logout; observar comportamento do proxy e ausência de cache compartilhado de dados autenticados |
| Consulta de solicitações | Cliente somente próprias, Gestor todas, Manutentor somente atribuídas; filtros por status, paginação, ordenação, detalhes e identificador inacessível |
| Perfis relacionados | Identificação de solicitante, responsável e autores visíveis; seleção de Manutentores ativos pelo Gestor, sem diretório indevido |
| Abertura | Campos válidos, autoria confiável, estado inicial e evento de abertura; recusar campos forjados |
| Triagem | Aprovar/descartar somente pelo Gestor e no estado permitido |
| Organização | Prioridade e responsável válidos; alterações, remoções permitidas, reatribuição e perda de acesso do antigo responsável |
| Atendimento | Início/conclusão pelo responsável atual, pré-condições e estados terminais |
| Histórico e observações | Leitura conforme acesso à solicitação, ordenação, autoria/data e valores anteriores/novos; observações autorizadas e imutabilidade |
| Integridade e concorrência | Transições inválidas, atomicidade quando evento falha e corridas relevantes do contrato existente |
| Superfície de segurança | Chamadas diretas, permissões de tabelas/RPCs/schemas, RLS, funções privilegiadas, metadados editáveis e ausência de segredo administrativo nos clientes |

Para cada linha, identificar interface consumida pelo frontend, regra contratual, teste reproduzível e resultado nos dois ambientes. Mapear explicitamente lacunas: existência de uma função ou teste isolado não comprova um fluxo completo.

## Estratégia da execução futura

1. Inventariar código, migrations, configuração e testes da v2; confrontar com os fluxos obrigatórios dos cartões atuais do MVP e os contratos aprovados. Fixar a revisão de código examinada.
2. Revisar migrations e permissões efetivas em local e cloud, apontando divergências. Consultar documentação instalada do Next.js e documentação atual do Supabase na execução.
3. Reaproveitar executores existentes; acrescentar somente cobertura faltante. Testar Auth/Data API/RPC com sessões reais e chave publicável. SQL privilegiado é apoio de preparação, falhas controladas, inspeção e limpeza, não substituto das operações do produto.
4. Exercitar o Next.js real com estrutura mínima de teste isolada, sem expor endpoints de apoio em produção. Conferir o alcance atual do logout e documentar limites dos tokens, sem prometer revogação imediata não demonstrada.
5. Corrigir lacunas comprovadas dentro das regras existentes e testar novamente. Se surgir decisão de negócio necessária, registrar o conflito e pedir decisão antes de mudar a regra.
6. Executar novamente suites pertinentes de autenticação, RLS, API e integridade, além de testes, lint, tipos e build. Validar operações do backend em local e cloud; o teste Next.js deve apontar explicitamente qual ambiente Supabase utiliza.
7. Conferir limpeza em ambos os ambientes e produzir relatório sem senhas, tokens ou chaves. Se algum ambiente ou fluxo não puder ser validado, registrar o bloqueio e manter o aceite pendente.

## Entregáveis e aceite

- Relatório vinculado a esta spec com matriz requisito/operação/teste/resultado e evidências novas identificadas por ambiente e revisão de código.
- Revisão de código, migrations e configuração com achados, impacto, correções e resultados da repetição dos testes. Distinguir comportamento comprovado de limitações.
- Contrato de integração atualizado somente onde necessário, com exemplos de requisições e respostas/erros sem credenciais, suficiente para orientar os dois frontends.
- Backend obrigatório disponível e validado para todos os fluxos mapeados; nenhuma falha conhecida que impeça esses fluxos ou permita acesso indevido permanece aberta no aceite.
- Ciclo de sessão comprovado no Next.js real, operações autenticadas aprovadas em local e cloud, verificações do projeto aprovadas e fixtures removidas com conferência.
- Progresso e evidências registrados no cartão correspondente e atualização conferida; preservar lista e responsáveis.

## Fora do escopo

Implementar telas finais; adicionar API própria Next.js sem necessidade demonstrada; patrimônio opcional; importar funcionalidades, dados ou credenciais da versão antiga; redesenhar regras aprovadas; adicionar funcionalidades fora do MVP. Esta revisão não constitui prova formal de ausência de vulnerabilidades nem inclui carga/escala empresarial.

## Encerramento da entrevista

O usuário confirmou as decisões em perguntas separadas. Este documento consolida a especificação; essas respostas não autorizam executar testes mutáveis, implementar correções ou alterar bancos. Aguardar pedido claro e separado para iniciar a execução. Nesta entrevista foram feitas leituras e documentação, sem alteração de código de produto ou banco.
