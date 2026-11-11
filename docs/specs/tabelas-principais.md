# Tabelas principais do sistema

Cartão: https://trello.com/c/vrIpSvNe
Status: implementada e validada em 2026-11-11 na branch `integration/tabelas-principais`, após pedido claro e separado via implement-spec. Evidências em [tabelas-principais-validation.md](tabelas-principais-validation.md).

## Problem Statement

A equipe do FixIt v2 precisa de uma estrutura persistente comum para identificar pessoas, armazenar solicitações de manutenção e preservar seus acontecimentos. A base atual possui clientes Supabase e uma verificação técnica, mas nenhuma tabela de negócio. Sem um contrato de integridade, as frentes de autenticação, gestão e atendimento podem produzir dados incompatíveis.

## Solution

Criar as tabelas profiles, solicitacoes e historico com vínculos, campos obrigatórios e restrições verificadas no banco. Preservar autoria e histórico, manter a API fechada até as políticas específicas e entregar a mesma estrutura validada em local e cloud.

## User Stories

1. Como integrante da equipe, quero um contrato único para perfis, solicitações e histórico, para integrar as frentes sem divergências.
2. Como pessoa usuária, quero um perfil vinculado à minha conta de acesso, para ter identidade consistente no sistema.
3. Como pessoa usuária, quero meu nome e um único papel fixo, para ser identificada com clareza.
4. Como Cliente, quero abrir solicitações para mim com título, descrição e local, para comunicar o problema de manutenção.
5. Como Cliente, quero um número simples e único para cada solicitação, para referenciar meu pedido.
6. Como Cliente, quero minha solicitação inicialmente Pendente, para aguardar a triagem do Gestor.
7. Como Gestor, quero definir prioridade Baixa, Média ou Alta, para organizar o atendimento.
8. Como Gestor, quero atribuir um único Manutentor ativo, para definir a responsabilidade pelo atendimento.
9. Como Gestor, quero aprovar antes de completar a atribuição, para organizar a triagem em etapas.
10. Como Manutentor, quero solicitações em atendimento com responsável e prioridade, para ter contexto para executar o trabalho.
11. Como integrante da equipe, quero estados e prioridades válidos no banco, para evitar registros inconsistentes.
12. Como pessoa usuária, quero histórico de abertura, status, prioridade e responsável, para acompanhar os acontecimentos da solicitação.
13. Como pessoa usuária, quero observações com autor e data, para compreender o contexto do atendimento.
14. Como pessoa usuária, quero corrigir observações por novos registros, para preservar o conteúdo original.
15. Como Gestor, quero desativar pessoas preservando vínculos, para manter a rastreabilidade.
16. Como Gestor, quero preservar atribuições de Manutentor desativado até reatribuir, para evitar perda de contexto.
17. Como integrante da equipe, quero bloquear exclusões que rompam vínculos, para preservar autoria e histórico.
18. Como integrante da equipe, quero rejeitar campos vazios e textos além dos limites, para manter um contrato previsível para os formulários.
19. Como responsável pela segurança, quero tabelas inicialmente fechadas ao aplicativo, para aguardar as políticas específicas sem expor dados.
20. Como integrante da equipe, quero aplicar e verificar a mesma estrutura em local e cloud, para trabalhar com ambientes consistentes.
21. Como novo integrante, quero instruções reproduzíveis e evidências dos testes, para conferir a integridade sem depender de conhecimento informal.

## Implementation Decisions

### Escopo confirmado

Definir a estrutura de `profiles`, `solicitacoes` e `historico`: campos, chaves estrangeiras, valores válidos e restrições de integridade.

Cadastro, login e associação automática de perfil pertencem ao [MVP-01](https://trello.com/c/FfU6Vsm9). Políticas de acesso por papel pertencem ao [MVP-02](https://trello.com/c/aTmY7Xk2). Gravação automática do histórico e validação das transições pertencem ao [cartão de persistência e histórico](https://trello.com/c/5rZFakvy).

### Identidade e papéis confirmados

Cada pessoa possui exatamente um papel: Cliente, Gestor ou Manutentor. Acúmulo de papéis não faz parte do modelo.

O papel é definido na criação do perfil e não pode ser alterado posteriormente no MVP. O fluxo de concessão de papéis será definido no cartão de autenticação.

Somente Cliente abre solicitações, para si próprio. Gestor e Manutentor não abrem solicitações; representação de outra pessoa está fora do MVP. Esta decisão é da v2 e não incorpora a regra histórica de abertura pelos três papéis.

### Dados pessoais confirmados

O perfil guarda nome obrigatório e papel, além do vínculo com a conta de acesso. E-mail e senha permanecem no Supabase Auth, sem cópia no perfil. Matrícula e setor pessoal não fazem parte deste modelo.

### Conteúdo da solicitação confirmado

O Cliente informa título, descrição e local, todos obrigatórios. Local é texto livre, sem tabela de setores ou ambientes. Categoria não faz parte deste recorte.

Estados permitidos: Pendente, Aprovada, Em atendimento, Concluída e Descartada. Fluxo principal: Pendente → Aprovada → Em atendimento → Concluída; Descartada representa rejeição pelo Gestor. Não haverá estado Cancelada. As regras completas de transição pertencem ao cartão de persistência.

A solicitação nasce Pendente, sem prioridade e sem responsável. O Gestor define prioridade Baixa, Média ou Alta e atribui no máximo um Manutentor. A aprovação não exige preencher ambos na mesma operação.

### Histórico confirmado

Registrar abertura, mudanças de status, prioridade e responsável, além de observações. Cada evento preserva solicitação, autor, data e valores anteriores/novos quando houver mudança. Auditoria de edições de título, descrição e local não faz parte deste recorte. Este cartão define o armazenamento; a geração automática pertence ao cartão de persistência.

Histórico imutável: registros não podem ser editados nem apagados. Observações incorretas são corrigidas por uma nova observação, preservando a original.

### Preservação confirmada

Perfis terão estado ativo/inativo. A saída de uma pessoa desativa o perfil e preserva suas solicitações, autoria e vínculos históricos. Bloquear exclusão física de perfis referenciados e de solicitações com histórico, sem exclusão em cascata desses dados. A aplicação efetiva da desativação ao acesso pertence aos cartões de autenticação e permissões.

Desativar um Manutentor preserva as atribuições existentes até reatribuição pelo Gestor; novas atribuições ao inativo são proibidas. Não há remoção automática nem bloqueio da desativação por solicitações em aberto.

### Integridade confirmada

Cada solicitação terá identificador interno UUID e número sequencial único para referência humana, gerado pelo banco, sem reinício anual e sem garantia de ausência de lacunas.

Em atendimento e Concluída exigem prioridade e responsável preenchidos. Pendente, Aprovada e Descartada admitem ambos vazios. Esta restrição sobre o estado armazenado pertence a este cartão; controle de quem pode executar cada transição e registro automático pertencem aos cartões seguintes.

Textos obrigatórios não podem ser vazios nem conter apenas espaços. Limites: nome 120, título 150, local 200, descrição e observação 5.000 caracteres.

### Contrato técnico consolidado

Os nomes e tipos abaixo concretizam as decisões da entrevista. Não representam tabelas já criadas.

| Tabela | Campos |
| --- | --- |
| `profiles` | `id` UUID, chave primária e FK para `auth.users.id`; `nome` obrigatório; `papel` obrigatório e fixo; `ativo` booleano obrigatório, inicialmente verdadeiro; `created_at` com fuso, gerado pelo banco. |
| `solicitacoes` | `id` UUID gerado pelo banco; `numero` inteiro sequencial único; `solicitante_id` obrigatório, FK para profiles; `titulo`, `descricao`, `local` obrigatórios; `status` obrigatório, inicialmente pendente; `prioridade` opcional; `responsavel_id` opcional, FK para profiles; `created_at` com fuso, gerado pelo banco. |
| `historico` | `id` UUID gerado pelo banco; `solicitacao_id` e `autor_id` obrigatórios, FKs para solicitacoes e profiles; `tipo` obrigatório; `created_at` com fuso, gerado pelo banco; `observacao` e campos tipados de valores anteriores/novos conforme o evento. |

Valores persistidos: papéis `cliente`, `gestor`, `manutentor`; status `pendente`, `aprovada`, `em_atendimento`, `concluida`, `descartada`; prioridades `baixa`, `media`, `alta`; eventos `abertura`, `alteracao_status`, `alteracao_prioridade`, `alteracao_responsavel`, `observacao`.

Para eventos de alteração, pares `status_anterior/novo`, `prioridade_anterior/nova` e `responsavel_anterior/novo` guardam os valores relevantes; responsáveis históricos referenciam profiles por FK. Rejeitar pares alheios ao tipo de evento, alterações sem diferença e valores inválidos. Prioridade e responsável anteriores/novos admitem nulo para representar atribuição inicial ou remoção. Observação exige texto não vazio; abertura não exige pares de alteração. Não duplicar snapshots inteiros nem introduzir JSON livre para esses valores.

As FKs preservam dados por restrição de exclusão, incluindo a ligação de profiles ao Auth; não usar cascata de exclusão. Desativação é o caminho do MVP. IDs e vínculos de autoria não podem ser reescritos para contornar preservação. Registros de histórico são somente de acréscimo, inclusive para operações comuns de banco; privilégios administrativos continuam capazes de manutenção explícita.

Validar no banco que novas solicitações pertencem a Cliente ativo e novas atribuições apontam para Manutentor ativo. A desativação posterior não invalida vínculos existentes, inclusive referências no histórico. Imutabilidade do papel, validações entre tabelas e imutabilidade do histórico podem exigir triggers de integridade neste cartão; isso não inclui triggers de geração automática de eventos. A autorização do usuário que executa uma ação permanece no MVP-02.

Indexar FKs usadas em consulta: solicitante, responsável, autor e vínculo do histórico à solicitação; permitir ordenar histórico por data e identificador. Evitar índices adicionais sem consulta que os justifique.

### Proteção inicial e entrega

Versionar migration própria da v2 e aplicar/validar em local e cloud. Não copiar dados, migrations nem credenciais da versão antiga.

Habilitar RLS nas três tabelas, sem políticas permissivas ou liberação provisória para o aplicativo. As políticas por papel serão entregues no MVP-02; até lá, o acesso comum pela API permanece fechado. Testes de integridade usam conexão de teste apropriada, sem expor chave privilegiada ao navegador.

## Testing Decisions

- Ponto principal confirmado pelo usuário: operações SQL reais no PostgreSQL, em local e cloud, verificando comportamento observável. API real como ponto complementar para verificar o bloqueio inicial por RLS.
- Testar as três tabelas em conjunto: inserções e atualizações válidas; rejeição de valores, vínculos e combinações inválidos; preservação após desativação; proibição de alterações do histórico e de exclusões que rompam referências.
- Incluir limites exatos e acima do máximo, textos só com espaços, referências inexistentes, papel incorreto, perfil inativo e transições entre combinações de campos válidas/inválidas. Não testar implementação interna de triggers ou fazer comparação textual do SQL.
- Testar imutabilidade com um papel de banco apropriado às operações comuns, distinguindo manutenção administrativa explícita. A matriz de autorização por papel do aplicativo permanece fora deste cartão.
- Usar fixtures isoladas e rollback para testes SQL; eventuais contas Auth criadas fora da transação precisam de limpeza explícita. Não deixar dados de teste no cloud. Lacunas em sequências não são falha.
- Exercitar a API com acesso anônimo e identidade autenticada de teste; ausência de políticas não pode expor linhas nem permitir escrita.
- Precedente existente: testes de comportamento do comando de verificação do Supabase com node:test. Eles não comprovam integridade de domínio; este cartão acrescenta a verificação de banco real, reaproveitando o executor quando adequado e sem novas telas técnicas.
- Preservar a consulta técnica de setup. Executar as verificações existentes de testes, lint, tipos e build quando da implementação, além dos testes reais de banco. Nenhuma migration ou validação em banco ocorreu durante esta especificação.

## Critérios de aceite

1. A mesma migration cria as três tabelas e suas restrições em local e cloud, preservando o setup técnico existente.
2. Perfil referencia conta Auth real e única; nomes vazios, papel inválido e mudança posterior de papel são rejeitados.
3. Solicitações válidas recebem UUID, número único, data e estado inicial; referências inexistentes, solicitante que não é Cliente ativo e nova atribuição a pessoa que não é Manutentor ativo são rejeitadas.
4. Campos obrigatórios e limites são respeitados; status e prioridade inválidos são rejeitados; Em atendimento e Concluída exigem prioridade e responsável.
5. Eventos manuais de teste demonstram os tipos previstos, autoria e data; payload incompatível, mudança sem diferença, edição e exclusão de histórico são rejeitados.
6. Exclusões de registros referenciados são bloqueadas; desativação preserva autoria e atribuições existentes, sem permitir novas atribuições ao inativo.
7. RLS está habilitada e acessos comuns pela API não expõem dados nem permitem alterações antes das políticas do MVP-02.
8. Testes de integridade positivos e negativos passam nos dois ambientes; fixtures são isoladas e não deixam dados de teste no cloud. Documentar aplicação, verificações e limitações.

## Out of Scope

Cadastro, login, logout, criação automática do perfil, concessão de papéis e sessões pertencem ao [MVP-01](https://trello.com/c/FfU6Vsm9). Políticas por papel e bloqueio efetivo de acesso de inativos pertencem ao [MVP-02](https://trello.com/c/aTmY7Xk2). Transições completas, autorização de ações, geração automática de eventos e atomicidade entre alteração e evento pertencem aos cartões de permissões e [persistência e histórico](https://trello.com/c/5rZFakvy).

Não incluir telas, cadastro de setores ou ambientes, categorias, anexos, patrimônio, notificações, cancelamento, representação de solicitante, acúmulo ou mudança de papéis, auditoria de título/descrição/local ou importação da versão antiga.

## Further Notes

A entrevista foi encerrada e o usuário solicitou a síntese via to-spec. A estratégia de testes foi confirmada separadamente. A aprovação desta spec não autoriza implementar, conforme as instruções do projeto.

O contrato é exclusivo da v2 e respeita a stack do ADR 0001. Requisitos históricos do Trello não representam decisões ou progresso desta versão. A restrição de exclusão na FK do perfil para Auth é deliberada: desativação preserva vínculos; uma futura necessidade de remoção de identidade exigirá rever esse contrato.

## Referências técnicas

- [Supabase: dados de usuário e vínculo com Auth](https://supabase.com/docs/guides/auth/managing-user-data).
- [Supabase: RLS e comportamento sem políticas](https://supabase.com/docs/guides/database/postgres/row-level-security).
