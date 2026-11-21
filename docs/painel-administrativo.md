# Painel administrativo (Integrante 3 — Paulo)

Telas do Gestor e do Manutentor. Cartões: [FRONT] Estruturar painel, MVP-05, MVP-06, MVP-07/08 e MVP-09/10.

## Como o código está organizado

```
src/lib/painel/
  regras.ts      Quem pode fazer o quê (decide quais botões aparecem) + textos da tela
  dados.ts       Consultas ao Supabase (lista, detalhe, histórico, manutentores) + login obrigatório
src/app/painel/
  acoes.ts       Server Actions: rodam no servidor quando um formulário é enviado; chamam as RPCs
  formularios.tsx  Formulários (login, botões de status, prioridade/responsável, observação)
  componentes.tsx  Selos de status/prioridade e histórico
  painel.module.css
  entrar/page.tsx                          /painel/entrar
  (protegido)/layout.tsx                   topo com nome, papel e "Sair"; exige login
  (protegido)/... a pasta entre parênteses não entra na URL; só agrupa as páginas que exigem login
  (protegido)/solicitacoes/page.tsx        /painel/solicitacoes  (lista + filtro)
  (protegido)/solicitacoes/[id]/page.tsx   /painel/solicitacoes/<id>  (detalhes + ações)
tests/painel-regras.test.mjs   testes de regras.ts
scripts/demo-preparar.mjs      dados da demonstração
```

## O que acontece quando o Gestor clica em "Aprovar"

1. `BotaoStatus` (formularios.tsx) pede confirmação com `window.confirm`.
2. O formulário envia `id` e `status` para a Server Action `mudarStatus` (acoes.ts), que roda no servidor.
3. `mudarStatus` confere quem está logado e chama a RPC `transicionar_solicitacao` do banco.
4. O banco (parte do João) verifica de novo se a pessoa pode fazer isso, altera o status e grava o evento no histórico, tudo na mesma transação.
5. `revalidatePath` recarrega a página, que busca os dados de novo e mostra o novo status e o novo evento no histórico.

**Ponto importante para explicar:** a tela esconde os botões que a pessoa não pode usar (`regras.ts`), mas quem garante a regra é o banco (RLS + RPCs). Se alguém tentar burlar a tela, o banco recusa com o erro `42501`.

**Por que o Manutentor só vê as próprias solicitações?** O código da lista é o mesmo para os dois papéis. Quem filtra é a RLS do banco: o Gestor recebe todas e o Manutentor só as que estão atribuídas a ele.

## Fluxo de status

```
pendente ──(Gestor aprova)──> aprovada ──(Manutentor inicia)──> em_atendimento ──(Manutentor conclui)──> concluida
    └──(Gestor descarta)──> descartada
```

Para iniciar o atendimento, a prioridade e o responsável precisam estar definidos.

## Rodar a demonstração na sua máquina

Pré-requisitos: Docker Desktop aberto e `npm ci` feito.

```sh
npm run supabase:start     # sobe o banco local (a primeira vez demora)
npm run demo:resetar       # apaga o banco local e cria os dados da demonstração
npm run dev                # http://127.0.0.1:3000/painel/entrar
```

Na primeira vez, crie `.env.supabase.local` e `.env.local` conforme o README (URL e chave **publicável** que aparecem em `npm run supabase:status`).

Contas (só existem no banco local):

| Papel | E-mail | Senha |
| --- | --- | --- |
| Gestor | gestor@fixit.local | gestor123 |
| Manutentor | manutentor@fixit.local (Marcos) | manut123 |
| Manutentora | manutentor2@fixit.local (Nina) | manut123 |
| Cliente | cliente@fixit.local | cliente123 |

Estado inicial: 3 pendentes, 1 descartada, 1 em atendimento (Nina) e 1 concluída (Marcos).

### Roteiro (cerca de 5 minutos)

Use uma janela normal para o Gestor e uma **janela anônima** para o Manutentor, assim os dois ficam logados ao mesmo tempo.

1. **Controle de acesso:** entre como Cliente → recusado ("O painel é só para Gestor e Manutentor").
2. **Gestor — lista (MVP-05):** entre como Gestor. Mostre as 6 solicitações e use o filtro "Pendente".
3. **Gestor — aprovar (MVP-06):** abra "Vazamento na pia" → Aprovar → confirme. O status muda e o evento aparece no histórico.
4. **Gestor — organizar (MVP-07):** prioridade Alta e responsável Marcos → Salvar. O histórico mostra os dois eventos.
5. **Gestor — descartar:** abra "Porta emperrada" → Descartar → confirme. Não sobram ações.
6. **Manutentor — só vê o que é dele:** na janela anônima, entre como Marcos. Ele vê "Vazamento na pia" e "Lâmpada queimada", mas não vê o chamado da Nina.
7. **Manutentor — atendimento (MVP-09/10):** abra "Vazamento na pia" → Iniciar atendimento → escreva uma observação → Concluir chamado.
8. **Histórico completo:** volte ao Gestor e recarregue "Vazamento na pia". O histórico mostra todos os passos, com autor e horário.

Para repetir a demonstração do zero: `npm run demo:resetar`.
