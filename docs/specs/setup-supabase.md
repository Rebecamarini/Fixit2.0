# SETUP — Configurar Supabase e integração inicial

Cartão: https://trello.com/c/cMgHVTuv
Status: entrevista encerrada; pronta para implementação mediante pedido separado.

## Problem Statement

A equipe do FixIt v2 precisa de uma conexão Supabase reproduzível para desenvolver a nova aplicação. A base já declara o SDK, os nomes das variáveis e uma configuração local, mas ainda precisa comprovar consulta ao banco e integração com navegador e servidor. O banco e as credenciais da versão anterior não devem ser reutilizados.

## Solution

Configurar e validar Supabase local e um projeto cloud novo, com instruções para selecionar o ambiente e um comando no terminal que comprove uma consulta técnica pelo SDK. Nenhuma tela técnica será adicionada ao produto.

## User Stories

1. Como desenvolvedor, quero iniciar o Supabase local para trabalhar em um ambiente isolado.
2. Como integrante da equipe, quero um projeto cloud exclusivo da v2 para compartilhar a infraestrutura da nova aplicação.
3. Como responsável pelo projeto, quero criar o cloud somente com custo zero para evitar contratação de recursos pagos.
4. Como desenvolvedor, quero selecionar explicitamente local ou cloud para saber qual banco estou acessando.
5. Como desenvolvedor frontend, quero uma conexão disponível no navegador para integrar os próximos cartões.
6. Como desenvolvedor backend, quero uma conexão disponível no servidor Next.js para implementar operações futuras.
7. Como desenvolvedor, quero consultar uma função técnica pelo SDK para comprovar que a conexão funciona sem antecipar tabelas de negócio.
8. Como desenvolvedor, quero executar a mesma verificação nos dois ambientes para identificar problemas de configuração.
9. Como integrante da equipe, quero receber resultado claro e código de falha no terminal para reconhecer uma integração quebrada.
10. Como responsável pela segurança, quero manter credenciais reais fora do Git e chaves privilegiadas fora do navegador.
11. Como novo integrante, quero instruções de configuração e verificação para reproduzir o ambiente.
12. Como responsável pela v2, quero preservar a separação da versão anterior para começar com banco e dados próprios.

## Implementation Decisions

- Manter a stack do ADR 0001: Next.js App Router, React, TypeScript e Supabase.
- Reaproveitar as dependências já declaradas; conferir sua instalação antes de adicionar pacotes.
- Manter a configuração e os comandos locais existentes; validar a execução com Docker.
- Criar o projeto cloud com nome fixit-v2, na organização Junior's Org (clpjmmkrnnuvvuwrhrgh), região São Paulo (sa-east-1).
- Criar somente com custo zero. Se a organização não tiver capacidade gratuita, registrar o bloqueio sem contratar recursos pagos.
- Se a região estiver indisponível, consultar o usuário antes de substituí-la.
- Preparar clientes para navegador e servidor; cadastro, login, logout e controle de sessão pertencem ao cartão de autenticação.
- Configurar URL e chave publicável por ambiente, sem fallback silencioso. Não usar chave privilegiada para mascarar falhas na consulta.
- Versionar uma função SQL técnica mínima, sem acesso a dados de negócio, reproduzível em local e cloud. Conferir desenho e permissões na documentação vigente.
- Expor a verificação por comando no terminal, sem página ou endpoint técnico público no produto.
- Documentar pré-requisitos, variáveis, seleção de ambiente, aplicação do SQL e verificação. Dados e mudanças não sincronizam automaticamente.
- Não copiar funcionalidades, migrations, dados, credenciais ou vínculo cloud da versão antiga.
- Antes de alterar a integração, consultar a documentação instalada do Next.js, o changelog e a documentação vigente do Supabase.

## Testing Decisions

- Ponto principal de verificação acordado: comando no terminal → SDK Supabase → função SQL técnica → banco do ambiente selecionado.
- Verificar comportamento externo: consulta efetiva, resposta esperada, mensagem clara e código de falha. Não testar detalhes internos dos clientes.
- Executar a consulta em local e cloud. O cartão não está concluído se um deles permanecer sem validação.
- Verificar os clientes de navegador e servidor nos contextos apropriados, sem introduzir telas técnicas permanentes. O comando Node sozinho não comprova execução no navegador; registrar essa evidência na implementação.
- Usar as verificações estáticas existentes: lint, tipos e build.
- Não há uma implementação de consulta semelhante na base inspecionada; a verificação pelo terminal é a nova entrada de teste escolhida na entrevista.
- Ausência ou incorreção de configuração deve produzir erro claro, sem expor segredos.

## Acceptance Criteria

1. Projeto cloud novo disponível com nome, organização, região e custo definidos.
2. Supabase local inicia com configuração própria da v2.
3. Seleção de ambiente e configuração documentadas; valores reais fora do Git.
4. Clientes de navegador e servidor disponíveis e verificados nos contextos apropriados.
5. Função técnica versionada e consulta pelo SDK aprovada em local e cloud.
6. Comando informa sucesso ou falha e retorna código de erro quando a verificação falha.
7. Documentação permite reproduzir a configuração e a verificação dos dois ambientes.
8. Lint, tipos e build passam.

## Out of Scope

Tabelas de negócio, perfis, solicitações, histórico, cadastro, login, logout, controle de sessão, políticas RLS do domínio, telas novas, importações da versão anterior e sincronização automática entre ambientes. As permissões da função técnica fazem parte deste setup.

## Further Notes

A escolha inicial de somente cloud foi revisada explicitamente pelo usuário: a decisão final é configurar e validar local e cloud. Os cartões de tabelas, autenticação e RLS permanecem separados.

Esta spec registra decisões técnicas de setup; não introduz termos de domínio nem substitui o glossário. Não há nova decisão que exija ADR separado.

A entrevista foi encerrada pelo usuário. A etiqueta ready-for-agent significa que a tarefa está especificada; não autoriza iniciar implementação nesta sessão sem pedido claro e separado, conforme AGENTS.md. Nenhum projeto ou recurso foi criado durante a entrevista.
