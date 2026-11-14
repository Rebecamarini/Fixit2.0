# Conferência da frente do João

Conferência solicitada pelo usuário após autorizar publicação e merge da revisão de integração e segurança. Fonte: cartões atuais do [Trello](https://trello.com/b/SsT0I7Di/backlog-do-produto-fixit), código da v2 e relatórios versionados. Não contabilizar registros históricos da versão antiga.

## Resultado

Os **seis cartões obrigatórios** da lista **Sprint Final— João** estão marcados como concluídos e possuem implementação e evidências correspondentes. A última entrega é a branch `integration/revisao-integracao-seguranca`, sobre a main `04d9028`; o resultado da publicação fica registrado no cartão de revisão. A conclusão da frente obrigatória não significa conclusão do produto inteiro.

| Cartão | Conferência da implementação | Evidência |
| --- | --- | --- |
| [Setup Supabase](https://trello.com/c/cMgHVTuv) | Projeto v2 próprio, configuração por ambiente, SDK, clientes browser/servidor e healthcheck | `setup-supabase-validation.md`; migrations e `scripts/check-supabase.mjs` |
| [Tabelas principais](https://trello.com/c/vrIpSvNe) | `profiles`, `solicitacoes`, `historico`, enums, FKs, constraints, imutabilidade e índices | `tabelas-principais-validation.md`; migration `20261111201148`; suite SQL |
| [Autenticação](https://trello.com/c/FfU6Vsm9) | Cadastro, login/contexto/logout, perfil atômico, provisão da equipe e sessão compartilhada browser/servidor | `mvp-01-autenticacao-validation.md`; `src/lib/auth.ts`, clientes e proxy; Auth real 32 verificações em cada ambiente nesta entrega |
| [RLS](https://trello.com/c/aTmY7Xk2) | Matriz de leitura por papel, quatro RPCs, DML direto bloqueado e perfil inativo sem acesso | `mvp-02-rls-validation.md`; migration `20261112203635`; RLS ampliada na revisão final |
| [Persistência e histórico](https://trello.com/c/5rZFakvy) | Eventos transacionais, autoria/data, transições, observações, integridade, rollback e concorrência | `persistencia-historico-validation.md`; testes atuais; correção posterior da ordem temporal registrada na revisão final |
| [Revisão de integração e segurança](https://trello.com/c/a6qjxn8S) | Fluxos do backend previstos para as telas, paginação/filtros, Next.js real, revisão do estado efetivo e correção da ordem do histórico | `revisao-integracao-seguranca-validation.md`: RLS 295 + Next.js 25 em cada ambiente, regressão RED/GREEN e 100 fluxos pós-correção; revisão final sem achados pendentes |

As evidências históricas mantêm o recorte de sua data: frases sobre tabelas fechadas ou ausência de sessão no setup não descrevem o estado atual. O contrato vigente para integrar as telas é [mvp-02-integracao.md](mvp-02-integracao.md), atualizado com exemplos e limites da ordenação temporal.

## O que permanece fora desses seis cartões

- **[MVP-12 — Vincular bem patrimonial](https://trello.com/c/AYEF78UP): aberto, na lista Opcionais, atribuído a João e Rebeca.** Não há `solicitacoes_bens` nem operação de vínculo na v2. Depende dos bens do [MVP-11](https://trello.com/c/WnIvsGO6), também opcional e ainda aberto. Portanto, a afirmação de conclusão aplica-se à frente obrigatória, e não a toda tarefa que mencione João.
- As frentes de Rebeca e Paulo ainda têm cartões abertos de telas e integração visual. O backend foi validado pelas interfaces que essas telas consumirão; isso não comprova aceite das telas finais. Nenhum cartão de frontend foi encerrado nesta conferência.
- A auditoria completa registra um aviso moderado transitivo das ferramentas de desenvolvimento (`minimatch` no parser do ESLint), sem caminho demonstrado por requisições do produto; auditoria de dependências de produção sem vulnerabilidades conhecidas. Esse acompanhamento está documentado, sem ampliar o MVP ou prometer ausência absoluta de risco.
- Provisão e desativação de pessoas continuam procedimentos técnicos, conforme o contrato aprovado, sem tela de gestão de perfis. Recuperação de senha, categorias, anexos e funcionalidades da versão antiga não são lacunas desses seis cartões aprovados.

Não foram alterados responsáveis, listas ou escopo dos cartões opcionais. Não há tarefa obrigatória faltante identificada no recorte aprovado da frente do João.
