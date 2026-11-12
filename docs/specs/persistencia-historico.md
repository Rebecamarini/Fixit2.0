# Persistência e histórico

Cartão: https://trello.com/c/5rZFakvy

Status: spec consolidada e aprovada em 2026-11-12; não autoriza implementação.

## Problem Statement

O cartão de persistência permanece aberto, embora tabelas principais e MVP-02 já entreguem mecanismos relacionados. A equipe precisa comprovar que cada requisito está atendido e identificar trabalho restante sem duplicar funcionalidades.

## Solution

Conferir o contrato existente, completar apenas lacunas demonstradas e produzir evidências atuais de persistência e histórico pela API real nos dois ambientes.

## User Stories

1. Como Cliente, quero abertura persistida com evento inicial, para acompanhar minha solicitação.
2. Como Gestor, quero aprovar ou descartar somente solicitações Pendentes, para respeitar a triagem.
3. Como Gestor, quero alterações de prioridade registradas, para explicar a organização do atendimento.
4. Como Gestor, quero alterações de responsável registradas, para preservar as atribuições anteriores.
5. Como Manutentor responsável, quero iniciar e concluir nas etapas permitidas, para registrar o atendimento.
6. Como pessoa autorizada, quero identificar autor e data dos acontecimentos, para compreender sua sequência.
7. Como pessoa autorizada, quero consultar valores anteriores e novos, para compreender cada mudança.
8. Como Gestor ou responsável, quero acrescentar observações permitidas, para registrar o contexto do atendimento.
9. Como pessoa autorizada, quero preservar observações originais, para manter rastreabilidade das correções por novos registros.
10. Como integrante da equipe, quero rejeitar status e transições inválidos, para preservar dados consistentes.
11. Como pessoa usuária, quero que falha do evento desfaça a mudança, para evitar histórico incompleto.
12. Como pessoa usuária, quero autoria e datas confiáveis, para impedir registros forjados.
13. Como integrante da equipe, quero ações concorrentes consistentes, para evitar alterações sobre estados incompatíveis.
14. Como integrante da equipe, quero verificar local e cloud, para confirmar o comportamento nos dois ambientes.
15. Como integrante da equipe, quero reutilizar testes e mecanismos existentes, para evitar duplicação.
16. Como responsável pelo cartão, quero uma matriz de requisitos e evidências, para justificar seu encerramento.

## Implementation Decisions

Em 2026-11-12, o usuário escolheu validar e fechar lacunas: manter as regras existentes, conferir cada requisito do cartão e especificar apenas correções ou evidências que faltarem.

A base é o contrato em `mvp-02-integracao.md`, as migrations de tabelas principais e MVP-02 e as evidências em `mvp-02-rls-validation.md`. A entrega do MVP-02 não encerra automaticamente este cartão. Não ampliar o domínio nem reabrir regras já aprovadas sem decisão explícita.

## Limite do histórico confirmado

O histórico obrigatório cobre as operações autenticadas da aplicação. Cada mudança efetiva deve gerar seu evento na mesma transação, com autor e data confiáveis. Manutenção administrativa direta por SQL permanece fora dessa garantia, conforme o contrato existente. Decisão confirmada pelo usuário em 2026-11-12.

## Testing Decisions

O aceite exige API real em local e cloud exclusivos da v2. Reaproveitar os testes existentes, completar lacunas identificadas e repetir a validação nos dois ambientes. Não depende de novas telas; pode terminar sem alteração de código se a cobertura e o comportamento existentes atenderem integralmente ao cartão.

Usar como ponto principal a Data API/RPC autenticada existente e os executores de RLS e integridade como precedentes. Verificar comportamento observável de solicitações e histórico, sem comparar texto SQL ou detalhes internos das funções. SQL privilegiado serve à preparação, indução controlada de falhas e limpeza; não substitui as operações autenticadas testadas.

1. Mapear cada item do cartão à implementação e às verificações correspondentes, distinguindo evidência anterior de execução nova.
2. Valores de status inválidos e transições proibidas são rejeitados sem mudança parcial. Preservar o fluxo e a matriz de autorização do MVP-02, incluindo estados terminais.
3. Abertura, mudanças efetivas de status, prioridade e responsável geram os eventos previstos; observações autorizadas são acrescentadas ao histórico. Organização sem mudança não gera evento; alteração dos dois campos gera dois eventos.
4. Autor e data são determinados pelo banco, e os eventos guardam valores anteriores/novos pertinentes. Não permitir forjar autoria, datas ou eventos pela aplicação; histórico é imutável.
5. Falha no registro do evento desfaz a alteração. Preservar integridade de vínculos, acesso por perfil e comportamento concorrente previsto no contrato atual.
6. Registrar resultados reproduzíveis em local e cloud, com fixtures isoladas e limpeza conferida, sem credenciais nos documentos.
7. Corrigir somente lacunas demonstradas; executar verificações apropriadas às alterações. Se não houver lacunas, registrar o atendimento integral sem criar migration ou funcionalidade apenas para este cartão.

## Out of Scope

Novas telas, auditoria de manutenção administrativa, novas regras de negócio, importação da versão antiga e encerramento automático do cartão separado de revisão de integração e segurança.

## Further Notes

Síntese confirmada pelo usuário em 2026-11-12, com pedido de consolidação da spec. Aguardar pedido claro e separado para executar a validação e eventuais correções. Nenhum código ou banco foi alterado nesta entrevista.
