# FixIt 2.0

Novo projeto para gestão de solicitações de manutenção, com escopo reduzido. A versão 1.0 na pasta irmã será descontinuada; sua implementação não representa progresso desta versão.

O backlog fica no [Trello](https://trello.com/b/SsT0I7Di/backlog-do-produto-fixit). Os cartões atuais do MVP tratam de autenticação, solicitações, gestão e atendimento. Cliente solicita e acompanha; Gestor organiza; Manutentor atende solicitações atribuídas. Patrimônio está na lista Opcionais.

O quadro também contém decisões e evidências históricas da versão antiga. Confirmar a aplicabilidade de cada requisito ao MVP antes de implementar. Esta base técnica não implementa histórias do produto.

## Linguagem

**Papel**: Função única de uma pessoa no FixIt: Cliente, Gestor ou Manutentor. É definido na criação e permanece fixo no MVP.

**Cliente**: Pessoa que abre solicitações de manutenção para si e acompanha suas próprias solicitações.

**Solicitante**: Cliente que abriu a solicitação. Abertura em nome de outra pessoa não faz parte do MVP.

**Solicitação**: Pedido de manutenção aberto por um Cliente, com título, descrição e local. Pode estar Pendente, Aprovada, Em atendimento, Concluída ou Descartada.
_Evitar_: Chamado.

**Descartada**: Solicitação rejeitada pelo Gestor.

**Prioridade**: Classificação Baixa, Média ou Alta definida pelo Gestor para organizar o atendimento. Pode estar indefinida antes da triagem.

**Responsável**: Único Manutentor atribuído a uma solicitação. Uma solicitação pode ainda não ter responsável.

**Histórico**: Registro dos acontecimentos de uma solicitação: abertura, mudanças de status, prioridade ou responsável e observações, com autor e data.

**Perfil inativo**: Pessoa desativada no FixIt, cujos vínculos e registros anteriores são preservados.
