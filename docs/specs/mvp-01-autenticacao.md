# MVP-01 — Autenticação e associação do perfil

Cartão: https://trello.com/c/FfU6Vsm9
Status: implementada e validada em 2026-11-11 na branch `integration/mvp-01-autenticacao`, após pedido claro e separado via implement-spec. Evidências em [mvp-01-autenticacao-validation.md](mvp-01-autenticacao-validation.md).
Prioridade: Obrigatória.

## Problem Statement

Pessoas ainda não conseguem criar uma conta, entrar e sair do FixIt v2. Os frontends precisam de uma integração comum que associe a identidade autenticada ao perfil correto, mantenha a sessão e impeça que um cadastro público conceda privilégios de equipe.

A base já possui clientes Supabase, estrutura de perfis e verificações técnicas. Esses clientes desabilitam persistência e renovação de sessão; não há fluxo de autenticação do produto. A tabela profiles exige vínculo único com Auth, nome, papel fixo e estado ativo. Seu acesso comum está fechado.

## Solution

Entregar uma integração reutilizável de cadastro, login, consulta de sessão/perfil e logout, sem telas. Cliente se cadastra com nome, e-mail e senha e entra imediatamente, sem confirmação de e-mail. Gestor e Manutentor são provisionados administrativamente. Conta e perfil devem nascer juntos, e a sessão deve persistir entre usos do navegador enquanto válida.

## User Stories

1. Como visitante, quero me cadastrar com nome, e-mail e senha, para usar o FixIt como Cliente.
2. Como Cliente, quero entrar imediatamente após o cadastro, para começar a usar o produto sem confirmação por e-mail.
3. Como Cliente, quero ter um perfil ligado à minha conta, para manter minha identidade nas solicitações.
4. Como Cliente, quero receber uma falha clara quando o cadastro não concluir, para poder tentar novamente.
5. Como Cliente, quero que uma falha na criação do perfil não deixe uma conta incompleta, para conseguir repetir o cadastro.
6. Como pessoa usuária, quero entrar com e-mail e senha, para acessar minha conta.
7. Como pessoa usuária, quero que credenciais inválidas sejam recusadas, para proteger meu acesso.
8. Como pessoa usuária, quero que tentativas repetidas de cadastro não dupliquem minha identidade, para preservar meus vínculos.
9. Como pessoa usuária, quero continuar conectada ao reabrir o navegador enquanto a sessão for válida, para evitar logins desnecessários.
10. Como pessoa usuária, quero voltar ao estado desconectado quando a sessão expirar definitivamente, para poder entrar novamente.
11. Como pessoa usuária, quero consultar minha identidade e meu perfil atual, para que o frontend apresente o contexto correto.
12. Como pessoa usuária, quero sair da conta, para encerrar meu acesso no navegador.
13. Como Gestor, quero entrar com a conta criada administrativamente, para exercer meu papel.
14. Como Manutentor, quero entrar com a conta criada administrativamente, para acessar o atendimento.
15. Como administrador técnico, quero provisionar contas da equipe com o papel correto desde a criação, para respeitar sua imutabilidade.
16. Como responsável pelo produto, quero impedir que um visitante escolha ser Gestor ou Manutentor, para preservar a concessão de privilégios.
17. Como integrante do frontend, quero operações comuns de autenticação sem depender de formulários específicos, para integrar os dois frontends.
18. Como integrante do frontend, quero distinguir ausência de sessão, falha de autenticação e indisponibilidade do serviço, para apresentar mensagens adequadas.
19. Como responsável pela segurança, quero que senhas e credenciais privilegiadas fiquem fora de perfis, respostas e logs, para proteger as contas.
20. Como integrante da equipe, quero testes reais do cadastro até o logout, para confiar na integração.
21. Como integrante da equipe, quero executar validações isoladas em local e cloud v2, para evitar divergências e resíduos de teste.

## Implementation Decisions

### Decisões confirmadas na entrevista

- Cadastro público exclusivo para Cliente; não aceitar papel nem estado ativo como escolhas do visitante.
- Método único: e-mail e senha para os três papéis. Sem login social ou link de acesso.
- Sem confirmação de e-mail no cadastro público. Entrada imediata após sucesso; o fluxo não comprova posse do endereço.
- Receber apenas nome, e-mail e senha. Nome obrigatório com até 120 caracteres, respeitando a restrição existente contra texto vazio ou só espaços.
- Gestor e Manutentor criados administrativamente, sem tela de gestão neste cartão.
- Conta Auth e perfil criados como unidade: qualquer falha do perfil impede concluir o cadastro e não deixa conta órfã.
- Sessão persiste após fechar/reabrir o navegador enquanto válida, com renovação quando permitida.
- Sem telas de cadastro/login, painéis ou navegação visual nesta entrega.

### Contrato de integração

- Disponibilizar operações de cadastro de Cliente, login, consulta de identidade/sessão com perfil e logout. Provisionamento da equipe é operação administrativa separada.
- Cadastro recebe nome, e-mail e senha; login recebe e-mail e senha. Respostas não devolvem senha nem chaves privilegiadas.
- Distinguir sucesso, credenciais inválidas, entrada inválida, ausência de sessão, falha de associação de perfil e indisponibilidade. Não transformar falha de rede em credenciais inválidas.
- Não afirmar cadastro concluído ou acesso pronto antes de confirmar o vínculo de perfil.
- Identidade, papel e atividade devem vir de fonte confiável; dados editáveis pelo usuário não concedem privilégios.
- Reutilizar os clientes e a validação de ambientes existentes, adaptando persistência, renovação e contexto autenticado. A dependência de integração SSR já está instalada.
- Manter compatibilidade com Next.js App Router e acesso autenticado pelo servidor. Consultar documentação instalada do Next.js e documentação atual do Supabase antes de implementar.
- Reutilizar profiles e seu vínculo com Auth; não duplicar e-mail/senha no perfil, alterar papel depois da criação ou importar dados da versão antiga.
- Escolher na implementação um mecanismo transacional para a associação: remover depois uma conta órfã como compensação não substitui a garantia de atomicidade acordada.
- Se a associação exigir rotina privilegiada, limitar sua superfície e privilégios; nenhum segredo administrativo deve chegar ao navegador.
- A criação administrativa precisa respeitar o papel fixo desde a inserção; criar Cliente e depois promover não atende ao contrato existente.

### Fronteira com MVP-02

- Este cartão entrega somente o acesso mínimo necessário ao próprio perfil/contexto autenticado. Documentar qualquer concessão ou política nova.
- Não abrir solicitações ou histórico para viabilizar testes de login. A matriz de autorização por papel e o bloqueio de operações de inativos permanecem no MVP-02.
- Autenticar uma identidade não significa autorizar operações do produto.

### Premissas propostas para fechar a entrega

Os itens abaixo não foram confirmados na entrevista. São propostas explícitas para a implementação, sujeitas à revisão; não representam respostas do usuário.

- Logout encerra a sessão do navegador atual, incluindo suas abas, preservando outros dispositivos. A pergunta anterior ficou sem resposta. Não prometer revogação instantânea de todo token já emitido.
- Perfil ausente ou inativo não produz resultado de acesso pronto ao produto; devolver estado controlado. A aplicação integral dessa restrição às operações pertence ao MVP-02.
- Provisionamento administrativo via procedimento técnico documentado, restrito a operador autorizado; sem convite por e-mail ou envio automático de senha. Definir canal de entrega de acesso antes do uso com pessoas reais.
- Recuperação de senha, troca de e-mail/senha e gestão de perfis ficam fora desta entrega, pois não foram acordadas.
- Documentar a política efetiva de senha do Auth e validar de forma consistente; não introduzir regra de complexidade arbitrária. Avaliar o aviso existente sobre proteção contra senhas vazadas considerando as capacidades do plano.
- Aplicar configuração e verificar comportamento em Supabase local e cloud exclusivos da v2, com escolha explícita do ambiente.
- Cadastro duplicado não cria nova conta/perfil nem altera o perfil existente. Apresentar resultado seguro conforme o comportamento documentado do provedor, evitando expor dados da conta.

## Testing Decisions

- Estratégia confirmada pelo usuário nesta síntese: testar as operações públicas da integração contra Supabase real, do cadastro ao logout; SQL serve de apoio para preparação e conferência de integridade.
- Preferir um ponto principal de teste na interface consumida pelos frontends. Usar o contexto real de sessão necessário para verificar persistência/renovação; um cliente isolado em memória não comprova reabertura do navegador.
- Exercitar cadastro válido, nome vazio/só espaços/acima de 120 caracteres, e-mail inválido, senha recusada pelo Auth e cadastro repetido.
- Conferir vínculo único, nome, papel Cliente e estado ativo. Tentar forjar papel ou atividade pelo cadastro e por chamadas diretas.
- Provocar falha real controlada na criação do perfil em ambiente isolado; comprovar ausência de conta e perfil órfãos e sucesso de nova tentativa após remover a falha. Não introduzir um endpoint de falha em produção.
- Exercitar login válido e inválido nos três papéis, sessão ausente, sessão expirada e falha de serviço.
- Comprovar persistência entre contextos equivalentes à reabertura, renovação quando aplicável e logout no contexto que o frontend usa. Validar outro dispositivo conforme o alcance de logout finalmente adotado.
- Conferir retorno controlado para perfil ausente/inativo, sem confundir esse teste com a cobertura completa de RLS do MVP-02.
- Testar criação administrativa com papel correto e tentativa de concessão pública indevida. Não testar detalhes internos de triggers nem comparar texto de SQL.
- Precedentes: testes de comportamento com node:test, suite SQL transacional e verificações HTTP reais da API. As verificações atuais comprovam setup/integridade, não autenticação de produto.
- Rodar verificações existentes de testes, lint, tipos e build, além da integração real em local e cloud. Fixtures devem ser isoladas; limpar sessões, perfis de teste e contas respeitando a FK restritiva. Não deixar resíduos no cloud.
- Registrar evidências e limitações, sem tokens, senhas ou chaves em logs, Git ou documentação.

### Critérios de aceite

1. Cadastro público válido cria exatamente uma conta e um perfil Cliente ativo e permite acesso imediato, sem confirmação por e-mail.
2. Falha de criação do perfil faz o cadastro inteiro falhar e permite nova tentativa sem conta órfã.
3. Entradas inválidas e duplicadas não geram identidades adicionais; cadastro não permite obter papel de equipe.
4. Cliente, Gestor e Manutentor entram com credenciais válidas; credenciais inválidas são recusadas.
5. Consulta autenticada retorna identidade e perfil correspondentes, sem acesso indevido a outro perfil.
6. Sessão persiste entre usos e trata renovação/expiração; logout encerra o acesso no alcance documentado.
7. Procedimento administrativo reproduzível cria Gestor e Manutentor com papel correto desde a criação, sem tela nem segredo no frontend.
8. Solicitações e histórico continuam protegidos, sem antecipar a matriz de autorização do MVP-02.
9. Integração real e verificações existentes passam; aplicação/configuração, limpeza e limitações são documentadas nos dois ambientes.

## Out of Scope

Telas e painéis; solicitações e histórico; matriz completa de RLS por papel; gestão visual de pessoas; concessão pública de papéis de equipe; acúmulo ou mudança de papel; login social; link de acesso; confirmação de e-mail; migração de funcionalidades, contas ou credenciais da versão antiga.

Recuperação de senha e alterações de credenciais são exclusões propostas, conforme premissas acima, sem decisão anterior de produto sobre esses fluxos.

## Further Notes

A entrevista foi encerrada pelo pedido de síntese via to-spec. Não há resposta registrada à pergunta de alcance do logout. As premissas explicitadas permitem revisar o recorte sem atribuir decisões inexistentes ao usuário.

A publicação como ready-for-agent indica especificação disponível para execução futura; não substitui o pedido claro e separado de implementação exigido pelas instruções do projeto.

Respeitar o ADR de stack e o contrato das tabelas principais da v2. Não criar ADR para escolhas ainda não confirmadas nem transformar o glossário em spec técnica. Nenhum código de produto, configuração Auth ou banco foi alterado durante esta síntese.
