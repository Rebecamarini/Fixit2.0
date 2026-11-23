# Validação da unificação visual e navegação

Spec: https://trello.com/c/e5pWR9IN. Branch de integração: `feat/unificacao-visual-navegacao`.

## Entregas e dependências

- [UI-01 — Cliente](https://trello.com/c/27asIuSu): página única em `/solicitacoes`, seis contadores gerais informativos, navegação reduzida e raiz protegida com redirecionamento.
- [UI-02 — Equipe](https://trello.com/c/AEpXGiUh): estrutura e identidade azul em entrada, menu, cabeçalho, lista, detalhes, histórico e formulários.
- [UI-03 — Validação integrada](https://trello.com/c/DaTkfL9c): depende das duas entregas anteriores; inclui revisão e correções.

## Comportamentos verificados

Chromium com Supabase **local real**, usando sessões de Cliente, Gestor e Manutentor, em 1440 px e 390 px:

- 60 verificações aprovadas, incluindo duas de limpeza das contas e solicitações temporárias.
- Cadastro, login inválido, login real, logout e proteção das rotas.
- Raiz do Cliente chega à lista única; equipe continua chegando ao próprio painel.
- Lista completa com paginação de 20 itens; busca sem acentos e filtro de status; ausência de resultados e estado inicial vazio.
- Seis contadores conferidos com dados nos cinco status; os totais permanecem iguais ao pesquisar, filtrar e mudar de página.
- Cliente vê apenas as próprias solicitações; Manutentor não acessa detalhes de atribuição de outro.
- Fluxo real: Cliente abre → Gestor aprova e atribui → Manutentor inicia, registra observação e conclui → Cliente consulta responsável, prioridade, status e histórico. Sete eventos conferidos.
- Menu da equipe tem lista correspondente ao papel e nenhuma Visão geral adicional; logout continua funcional.
- Telas de lista, detalhes/formulários e entrada da equipe, além das páginas do Cliente, sem overflow global no celular. Tabelas usam rolagem localizada.
- Navegação por teclado conferida; capturas desktop/mobile inspecionadas.

## Regressão encontrada pelo navegador

O teste persistido `tests/browser/cliente-unificado.mjs` encontrou uma falha real: **Limpar filtros** mudava a URL, mas o campo de status ainda mostrava a seleção anterior. A correção reinicia o formulário quando pesquisa/status mudam. O mesmo teste passou após a correção, cobrindo página única, totais invariantes, menu, limpeza dos controles e navegação mobile para criação.

O script persistido usa uma conta local existente, não grava fixtures e aceita `APP_ORIGIN`, `CLIENTE_EMAIL`, `CLIENTE_PASSWORD`, `PLAYWRIGHT_MODULE` e `CHROME_BIN`. O teste integrado com fixtures foi executado em script temporário, reaproveitando o roteiro da validação anterior e removendo somente os dados temporários desta rodada. Não houve reset de banco, mudança de schema ou acesso ao cloud.

## Revisão

- Standards: nenhum achado na revisão inicial e na correção do formulário.
- Spec: identificado P2 no fallback global de erro da equipe, fora da identidade azul. Corrigido com boundaries da equipe e estados de carregamento próprios; revisão final sem achados pendentes.
- As cores dos cinco status foram alinhadas às do Cliente, preservando o significado visual entre os papéis.

Foram aprovadas mais dez verificações no navegador com falhas temporárias de renderização e atraso de resposta: mensagem segura, navegação preservada no erro da lista, fallback próprio para erro do layout, ausência de overflow mobile, recuperação pelo botão **Tentar novamente** nos dois casos e transição de carregamento para a lista. A recuperação usa `retry`, conforme a documentação instalada do Next.js 16.4.6. As injeções temporárias foram removidas e a ausência delas foi conferida no código final. Não houve alteração de banco nesses testes.

## Verificação automatizada

`npm run verify` passou em `1ba8482`: 26 testes, lint sem avisos, tipos e build de produção. Dois testes de infraestrutura precisam abrir uma porta local e foram executados fora do sandbox após `EPERM` na primeira tentativa.

Verificação final após a correção de estados da equipe: `npm run verify` aprovado novamente, com 26 testes, lint, tipos e build. Um build intermediário coincidiu com a injeção temporária de falha e foi descartado; a verificação final foi executada depois da restauração dos arquivos, sem injeções.

## Estado do Git

As entregas principais foram integradas até `1ba8482`. A correção final de estados da equipe, alinhamento das cores e documentos foi posteriormente autorizada para commit, push e conclusão do PR pelo usuário em 2026-11-23. Somente os arquivos desta entrega entram na publicação; alterações locais anteriores do usuário permanecem fora dos commits.

## Limites

Esta validação comprova execução local e não declara aceite humano. Os dados de demonstração anteriores e as alterações locais do usuário foram preservados. A publicação e conclusão do PR foram autorizadas separadamente após a validação.
