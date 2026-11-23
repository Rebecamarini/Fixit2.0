# Unificação visual da equipe e navegação do Cliente

Publicada no [cartão da spec no Trello](https://trello.com/c/e5pWR9IN), originalmente em Pronto para Implementação, com etiqueta `ready-for-agent`. Implementação concluída e validada; publicação autorizada pelo usuário em 2026-11-23. Evidências no documento de validação desta spec.

Implementação autorizada pelo usuário em 2026-11-23 via implement-spec, após a entrevista.

Grafo da implementação: UI-01 https://trello.com/c/27asIuSu/102-ui-01-unificar-acompanhamento-do-cliente, UI-02 https://trello.com/c/AEpXGiUh/103-ui-02-padronizar-%C3%A1rea-da-equipe-na-identidade-azul independentes; UI-03 https://trello.com/c/DaTkfL9c/104-ui-03-validar-e-revisar-unifica%C3%A7%C3%A3o-visual-integrada depende de ambas. Branch feat/unificacao-visual-navegacao.

## Problem Statement

O Cliente encontra duas entradas com forte sobreposição: Visão geral mostra contadores e cinco solicitações recentes, enquanto Minhas solicitações oferece a lista completa. Isso divide o acompanhamento de uma mesma tarefa entre duas páginas.

Gestor e Manutentor usam um painel verde com barra superior e apresentação diferente da área azul do Cliente. A diferença prejudica a consistência da experiência entre os papéis.

## Solution

Oferecer ao Cliente uma única página inicial, Minhas solicitações, em /solicitacoes, reunindo contadores informativos, pesquisa, filtro por status e lista completa paginada. A raiz / redireciona para essa página. O menu terá Minhas solicitações e Nova solicitação; a página também manterá o botão de criação.

Aplicar a identidade e estrutura visual do Cliente em toda a equipe: menu lateral azul-escuro, cabeçalho, fundo claro, cartões, tabelas, formulários e botões consistentes. O Gestor entra diretamente em Todas as solicitações e o Manutentor em Minhas atribuições, sem uma Visão geral adicional.

## User Stories

1. Como Cliente, quero entrar diretamente em Minhas solicitações, para acompanhar meus pedidos em um único lugar.
2. Como Cliente, quero encontrar apenas uma entrada de acompanhamento no menu, para evitar dúvidas entre páginas semelhantes.
3. Como Cliente, quero ver a lista completa paginada, para acessar solicitações além das cinco mais recentes.
4. Como Cliente, quero consultar Total, Pendentes, Aprovadas, Em atendimento, Concluídas e Descartadas, para entender a distribuição das minhas solicitações.
5. Como Cliente, quero que os contadores mostrem meus totais gerais mesmo durante pesquisas e filtros, para manter uma referência estável.
6. Como Cliente, quero pesquisar pelo número, identificador, título ou local já suportados, para encontrar uma solicitação específica.
7. Como Cliente, quero filtrar pelos cinco status, para consultar a etapa que me interessa.
8. Como Cliente, quero manter pesquisa e status ao trocar de página, para continuar minha consulta.
9. Como Cliente, quero limpar os filtros, para voltar à listagem sem restrições.
10. Como Cliente, quero abrir Nova solicitação pelo menu ou pelo botão da página, para registrar um pedido com facilidade.
11. Como Cliente, quero abrir os detalhes e acompanhar o histórico, para entender o andamento do atendimento.
12. Como Cliente, quero continuar acessando os endereços existentes de lista, criação e detalhes, para preservar meus caminhos de navegação.
13. Como Cliente sem solicitações ou resultados, quero receber uma mensagem clara, para entender o estado da lista.
14. Como Gestor, quero entrar diretamente em Todas as solicitações, para organizar a demanda sem uma tela intermediária.
15. Como Manutentor, quero entrar diretamente em Minhas atribuições, para encontrar os atendimentos sob minha responsabilidade.
16. Como integrante da equipe, quero reconhecer a mesma identidade azul do Cliente, para usar uma interface consistente.
17. Como integrante da equipe, quero ver meu nome e papel no cabeçalho, para identificar a sessão ativa.
18. Como integrante da equipe, quero acessar a saída da sessão na nova estrutura, para encerrar meu acesso.
19. Como integrante da equipe, quero usar listas, detalhes, histórico e formulários com apresentação consistente, para trabalhar sem mudanças visuais abruptas.
20. Como integrante da equipe, quero uma tela de entrada alinhada à identidade azul, para reconhecer o mesmo produto desde o acesso.
21. Como Gestor, quero continuar aprovando, descartando e definindo prioridade e responsável, para organizar o atendimento.
22. Como Manutentor, quero continuar iniciando e concluindo atendimentos e registrando observações, para executar meu trabalho.
23. Como usuário, quero distinguir status, prioridade, sucesso e erro, para interpretar corretamente as informações e ações.
24. Como usuário no celular, quero acessar navegação, tabelas, detalhes e formulários sem ações cortadas, para completar minhas tarefas.
25. Como usuário de teclado, quero navegar pelos controles com foco visível, para operar as telas sem mouse.
26. Como Cliente, quero visualizar somente minhas solicitações, para preservar a privacidade dos demais.
27. Como Manutentor, quero visualizar somente as solicitações atribuídas a mim, para manter o escopo do meu trabalho.
28. Como usuário, quero entender mensagens de carregamento, erro e ausência de dados, para saber o resultado da navegação.

## Implementation Decisions

- Unificar a composição da página do Cliente: resumo e lista completa na mesma tela, sem tabela adicional de recentes.
- Usar /solicitacoes como endereço canônico do acompanhamento; / redireciona para ele. Preservar encaminhamento e proteção de acesso por papel já existentes, evitando ciclos de redirecionamento.
- Preservar as rotas de criação e detalhes e os parâmetros atuais de pesquisa, status e paginação.
- Mostrar seis contadores apenas informativos, sem comportamento de clique ou filtragem. Calcular os totais sobre todas as solicitações do Cliente autenticado, antes de aplicar filtros e paginação.
- Preservar busca sem distinção de caixa e acentos e paginação de 20 itens, conforme comportamento existente.
- Adaptar os módulos de composição visual, navegação, cabeçalho, resumo, lista e estilos da área do Cliente e do painel da equipe. Reutilizar os componentes e estilos existentes quando isso simplificar a consistência.
- A referência visual é a área atual do Cliente: menu lateral azul-escuro, ação principal azul, fundo claro e conteúdo em cartões. A adaptação contempla entrada, listas, detalhes, histórico, formulários, mensagens e estados de interação da equipe.
- A navegação da equipe terá acesso direto à lista correspondente ao papel. Nome e papel aparecem no cabeçalho; a saída da sessão permanece acessível.
- Preservar as diferenças de ações e visibilidade entre Cliente, Gestor e Manutentor. A uniformização visual não adiciona criação de solicitações para a equipe.
- Manter cores semânticas legíveis para status, prioridade e mensagens, mesmo com a adoção da identidade azul.
- Preservar os contratos atuais de autenticação, consultas, histórico e ações. Não há mudança prevista de schema, API, regras de autorização ou fluxo de status.
- Usar a stack e CSS nativo existentes; consultar a documentação instalada do Next.js antes da implementação.

## Testing Decisions

- Ponto principal de validação: comportamento externo da aplicação no navegador, usando sessões reais dos três papéis e o backend local já utilizado pelo projeto.
- Testes bons verificam resultados observáveis, navegação, dados exibidos e permissões; não nomes de classes CSS, estrutura interna de componentes ou detalhes de implementação.
- Validar a página unificada, menu sem duplicação, redirecionamento da raiz e acesso direto a criação e detalhes.
- Preparar solicitações nos cinco status e conferir os seis contadores; repetir após pesquisa, filtro e paginação para comprovar que os totais permanecem gerais.
- Cobrir lista vazia, busca sem resultado, pesquisa combinada com status e navegação com mais de 20 solicitações.
- Conferir entrada, lista, detalhes, histórico e formulários da equipe em desktop e celular; inspecionar capturas para avaliar consistência com o Cliente, legibilidade e ausência de cortes. Não exigir nova infraestrutura de comparação automática de imagens.
- Conferir navegação por teclado e foco visível nos controles.
- Revalidar o fluxo Cliente abre → Gestor aprova e atribui → Manutentor inicia, registra observação e conclui → Cliente consulta status e histórico.
- Revalidar o isolamento entre Clientes e entre atribuições de Manutentores, login/logout e proteção de rotas.
- Aproveitar os testes existentes de consultas do Cliente, regras e parâmetros do painel. Executar a verificação atual de testes, lint, tipos e build.
- Usar como precedentes as validações Chromium com sessões reais, fluxo integrado e larguras de 1440 px e 390 px documentadas na transferência do frontend do Cliente e na revisão do painel.
- O plano de testes pela interface foi apresentado ao usuário no seletor; não houve resposta registrada. Adotado como proposta técnica padrão, sem declarar aprovação explícita do usuário.

## Out of Scope

- Implementar esta spec durante sua elaboração ou publicação.
- Criar outra Visão geral para Gestor ou Manutentor.
- Adicionar contadores da equipe, notificações, agenda, indicadores novos ou relatórios.
- Tornar os contadores do Cliente clicáveis ou dependentes da pesquisa.
- Alterar papéis, permissões, estados, regras de atendimento, banco de dados ou contratos de API.
- Criar funcionalidades do projeto anterior, patrimônio, anexos, setores ou abertura em nome de terceiros.
- Refazer a identidade visual do Cliente ou introduzir bibliotecas de UI e frameworks de estilo.
- Declarar aceite das entregas anteriores, mover cartões existentes ou alterar seus responsáveis.

## Further Notes

Decisões consolidadas na entrevista de 2026-11-23. O usuário aprovou a recomendação de manter /solicitacoes e redirecionar a raiz, com Nova solicitação no menu e na página.

No código atual, as entradas do Cliente são Visão geral e Minhas solicitações; Todas as solicitações pertence ao Gestor. A unificação é uma melhoria nova sobre telas existentes, não evidência de funcionalidade obrigatória ausente.

Referências relacionadas, preservadas como histórico da entrega anterior:
- [FRONT — Estruturar frontend do Cliente](https://trello.com/c/LI0WReOC).
- [MVP-04 — Listar minhas solicitações](https://trello.com/c/JchEIo1b).
- [FRONT — Estruturar painel administrativo](https://trello.com/c/t8JizGSr).
- [MVP-05 — Listar e filtrar solicitações para gestão](https://trello.com/c/R0fPjReQ).

Esta spec descreve o ajuste transversal novo e não duplica a implementação original desses cartões. A etiqueta ready-for-agent indicava especificação pronta para execução futura; o pedido separado para implementar foi recebido após a entrevista.
