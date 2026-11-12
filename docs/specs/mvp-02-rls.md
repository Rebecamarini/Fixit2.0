# MVP-02 — Permissões com RLS

Cartão: https://trello.com/c/aTmY7Xk2
Status: consolidada pelo usuário em 2026-11-12; pronta para implementação mediante pedido separado.
Prioridade: Obrigatória.

## Problem Statement

Os frontends precisam consultar e alterar solicitações sem expor dados de outras pessoas ou permitir ações de outro papel. A base já possui autenticação e integridade, mas solicitações e histórico permanecem fechados à aplicação. Liberar essas tabelas sem autorização por operação permitiria alterar status, identidade ou responsabilidade indevidamente.

## Solution

Entregar permissões no banco para Cliente, Gestor e Manutentor, com consultas restritas e escritas de acordo com o papel, o vínculo e o estado da solicitação. Integrar as alterações ao histórico automático e atômico, inclusive em chamadas diretas à API.

## User Stories

1. Como Cliente, quero abrir solicitações para mim, para comunicar uma necessidade de manutenção.
2. Como Cliente, quero consultar somente minhas solicitações, para preservar a privacidade das demais pessoas.
3. Como Cliente, quero acompanhar o histórico completo, para entender o andamento.
4. Como Gestor, quero consultar todas as solicitações, para organizar o trabalho.
5. Como Gestor, quero aprovar solicitações Pendentes, para liberar o atendimento.
6. Como Gestor, quero descartar solicitações Pendentes, para registrar rejeição na triagem.
7. Como Gestor, quero definir prioridade após a aprovação, para ordenar o trabalho.
8. Como Gestor, quero selecionar um Manutentor ativo, para atribuir responsabilidade.
9. Como Gestor, quero reatribuir um atendimento em andamento, para garantir continuidade.
10. Como Manutentor, quero consultar apenas solicitações atribuídas a mim, para acessar meu trabalho.
11. Como Manutentor responsável, quero iniciar atendimento de uma solicitação Aprovada, para registrar o início.
12. Como Manutentor responsável, quero concluir uma solicitação Em atendimento, para registrar a entrega.
13. Como Gestor ou responsável, quero acrescentar observações antes do encerramento, para contextualizar o trabalho.
14. Como pessoa usuária, quero identificar autores e responsáveis no histórico, para compreender os acontecimentos.
15. Como responsável pela segurança, quero bloquear perfis inativos mesmo com sessão aberta, para efetivar a desativação.
16. Como pessoa usuária, quero que registros anteriores sejam preservados, para manter rastreabilidade.
17. Como integrante da equipe, quero impedir falsificação de papel, solicitante, autor e data, para confiar nos dados.
18. Como integrante da equipe, quero gravar alteração e histórico juntos, para evitar registros parciais.
19. Como integrante do frontend, quero um contrato de operações autenticadas, para integrar as telas existentes.
20. Como integrante da equipe, quero testar acessos diretos nos dois ambientes, para verificar que a proteção independe da interface.

## Implementation Decisions

### Contrato técnico

Reutilizar autenticação, perfis e restrições existentes. Manter RLS nas tabelas expostas e combinar autorização de linhas com controle dos campos e ações permitidos. O frontend não é uma fronteira de segurança. Não conceder operações genéricas capazes de contornar a matriz.

A implementação pode usar operações da Data API ou rotinas autenticadas, devendo documentar o contrato efetivo para os frontends. Definir identidade pelo contexto autenticado e consultar papel/atividade em fonte confiável; metadados editáveis pelo usuário não concedem permissões. Nenhuma chave administrativa vai ao navegador. Preservar o procedimento de provisionamento do MVP-01.

Autor, data e eventos automáticos são definidos pelo banco; entrada humana no histórico limita-se à observação autorizada. Uma operação sem mudança efetiva não gera evento falso. Preservar integridade sob concorrência. Entregar migrations próprias da v2 e documentação de integração; consultar documentação atual do Supabase antes de implementar e documentação instalada do Next.js antes de alterar sua integração.

### Regras confirmadas

- O recorte inclui leitura e escrita autorizadas por papel. Coordenar regras de transição e geração de histórico com o cartão de persistência: https://trello.com/c/5rZFakvy.
- Cliente abre e acompanha solicitações, sem editar título, descrição ou local após a criação. Esta decisão substitui a permissão inicial de correção enquanto Pendente, após conferir que o frontend prevê somente leitura: https://trello.com/c/KB9E5WNt.

- Gestor não pode editar título, descrição ou local; seu acesso de gestão não concede alteração do relato do Cliente.

- Somente o Manutentor atualmente responsável pode iniciar e concluir atendimento. Gestor não recebe essas ações por seu papel.

- Gestor e Manutentor atualmente responsável podem acrescentar observações ao histórico. Cliente apenas acompanha, sem acrescentar observações.

- Solicitações Concluídas ou Descartadas não aceitam novas observações: o histórico fica congelado após o encerramento.

- Gestor pode trocar o responsável durante Em atendimento, antes da conclusão. A solicitação mantém seu estado; o antigo responsável perde acesso e o novo assume o atendimento.

- A visibilidade do histórico acompanha a solicitação: Cliente, Gestor e responsável atual veem todos os eventos e observações, inclusive anteriores à atribuição atual.

- Perfil inativo perde acesso aos dados em cada operação, mesmo com sessão Auth ainda válida; vínculos e registros anteriores são preservados.

- Ativação/desativação de perfis permanece em procedimento técnico, fora do acesso comum da aplicação: o usuário condicionou a inclusão à cobertura do frontend, e os cartões atuais de frontend não preveem gestão de pessoas. O painel administrativo prevê tabelas/detalhes de solicitações e seleção de Manutentor, não administração de perfis. Referências: https://trello.com/c/t8JizGSr e https://trello.com/c/IiFbEcXu.

- Gestor pode descartar somente solicitações Pendentes. Aprovadas e Em atendimento não podem ser descartadas.

- Gestor define ou altera prioridade e responsável somente em Aprovada e Em atendimento. Pendente aguarda aprovação; Concluída e Descartada ficam congeladas.

- Consulta de perfis limitada ao próprio perfil e às pessoas vinculadas às solicitações visíveis (incluindo autores e referências históricas). Gestor também pode listar Manutentores ativos para atribuição. Não liberar diretório geral de pessoas.

- Entregar junto a integração mínima de persistência e histórico automático: cada alteração autorizada e seu evento são atômicos. Não permitir forjar eventos de auditoria, autoria ou data. Coordenar esse escopo com o cartão de persistência, sem considerar o cartão inteiro concluído automaticamente.

## Base existente

Somente Cliente abre solicitações, para si. Papel único e fixo na criação. Cliente consulta as próprias solicitações; Manutentor consulta somente as atribuídas; Gestor consulta todas. Histórico imutável e vínculos preservados, conforme a spec de tabelas principais.

## Testing Decisions

Testes pela API real do Supabase em local e cloud exclusivos da v2, com os três papéis. Verificar operações permitidas e negadas, chamadas diretas que tentam contornar o frontend, inativação com sessão válida, perda de acesso após reatribuição e atomicidade do histórico. SQL serve de apoio à preparação e conferência; remover fixtures e não registrar credenciais.

Preferir o ponto público de integração consumido pelos frontends e chamadas autenticadas à Data API/RPC, conforme o mecanismo escolhido. Reaproveitar os executores existentes de autenticação e verificação de acesso da API, com fixtures isoladas. Testar comportamento externo, sem comparar texto de políticas ou detalhes internos de triggers. Testes SQL de integridade existentes são complementares.

Incluir operações sem sessão, outro Cliente, outro Manutentor, perfil ausente/inativo, acesso por identificador conhecido, leitura de perfis não relacionados, mutações em estados terminais e concorrência entre reatribuição/encerramento e ações do responsável. Uma ação concorrente não pode validar autorização em um estado e gravar sobre outro incompatível.

## Matriz de autorização

| Ação | Cliente | Gestor | Manutentor |
| --- | --- | --- | --- |
| Consultar solicitações e histórico completo | Próprias | Todas | Atualmente atribuídas |
| Abrir solicitação | Para si, Pendente, sem prioridade/responsável | Não | Não |
| Editar título, descrição e local após abrir | Não | Não | Não |
| Aprovar ou descartar | Não | Somente Pendente | Não |
| Definir prioridade e responsável | Não | Aprovada ou Em atendimento | Não |
| Iniciar atendimento | Não | Não | Responsável: Aprovada → Em atendimento |
| Concluir atendimento | Não | Não | Responsável: Em atendimento → Concluída |
| Acrescentar observações | Não | Antes do encerramento | Responsável, antes do encerramento |
| Alterar papel ou administrar perfis pela aplicação | Não | Não | Não |

A matriz pressupõe perfil ativo. Não há reabertura, retorno de status, exclusão pela aplicação nem alteração de identificadores, solicitante, autoria ou datas. Em atendimento exige prioridade e responsável; é possível substituir esses valores, mas não removê-los deixando o estado inválido. Em Aprovada, ambos continuam opcionais conforme o contrato existente. Concluída e Descartada são terminais.

## Critérios de aceite

1. Aplicar a matriz no banco, inclusive em chamadas diretas autenticadas; visitante e perfil ausente/inativo não obtêm dados de negócio nem executam operações.
2. Impedir alteração de papel, atividade, identidade e campos não autorizados pela aplicação, preservando o provisionamento administrativo existente.
3. Consultar somente os perfis necessários para solicitações/histórico visíveis e a seleção de Manutentores ativos pelo Gestor.
4. Garantir transições válidas, congelamento dos estados terminais, perda de acesso por reatribuição e preservação das referências históricas.
5. Gerar abertura e eventos de mudanças automaticamente, com autor/data confiáveis e atomicidade; permitir apenas observações autorizadas como entrada humana no histórico, sempre imutável.
6. Testes reais positivos e negativos passam nos dois ambientes, incluindo tentativas de forjar solicitante, papel, status, autor e eventos; falha da gravação do evento não deixa alteração parcial.
7. Executar verificações existentes apropriadas e documentar aplicação, limpeza e limitações sem segredos.

## Out of Scope

Novas telas, edição do relato, gestão visual de pessoas, mudança de papel, exclusão de solicitações, reabertura, comentários de Cliente e funcionalidades da versão antiga. A integração com persistência não implica concluir automaticamente todo o cartão relacionado.

## Further Notes

Consolidação aprovada pelo usuário, que solicitou a síntese via to-spec. A estratégia de testes pela API real nos dois ambientes foi confirmada durante a entrevista. Publicar como ready-for-agent não autoriza implementar; aguardar pedido claro e separado, conforme AGENTS.md.

O glossário existente continua válido; não surgiram novos termos que exijam alteração. Não criar ADR para um mecanismo técnico ainda não escolhido. Nenhum código de produto ou banco foi alterado nesta especificação.
