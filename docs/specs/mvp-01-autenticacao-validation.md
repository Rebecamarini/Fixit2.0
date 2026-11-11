# Validação — MVP-01

Cartão: https://trello.com/c/FfU6Vsm9. Implementação autorizada explicitamente
pelo usuário via implement-spec em 2026-11-11.

## TDD e contrato

- RED: teste de entrada inválida falhou porque o módulo ainda não existia.
  GREEN: validação pública recusa nome/e-mail/forma inválidos e concessão de papel.
- RED: teste de login/falha de rede falhou por operação ainda ausente.
  GREEN: operações retornam estados públicos sem divulgar respostas do provedor.
- RED real local: criação administrativa retornava papel Cliente; o Auth aplica
  app_metadata depois do INSERT inicial. GREEN: trigger de constraint diferível
  consulta os metadados administrativos ao concluir a transação. Perfil nasce
  com papel definitivo, preservando a atomicidade e a restrição de imutabilidade.
- Interface principal dos testes reais: createAuth com cliente SSR e cookies
  persistentes. SQL é auxiliar para conferir rollback, preparar perfil ausente/
  inativo e limpar fixtures. Não foi criada tela nem endpoint técnico no produto.

## Verificações executadas na worktree

- 11 testes node:test aprovados, lint e typecheck aprovados.
- Supabase local real: 32 verificações de cadastro, vínculo, metadados adversariais,
  login da equipe, rollback, renovação, logout e isolamento aprovadas; fixtures
  removidas. O executor é reutilizável em cloud com helper SQL e segredo privados.
- Build na worktree encontrou limitação do Turbopack por node_modules ser um link
  para fora da raiz. A validação final do build deve ocorrer após integração na
  raiz do projeto, onde as dependências são locais; não é evidência de aprovação.

## Consolidação na branch de integração

- Código integrado em `d3c4778`, com implementação em `df3046f`.
- `npm run verify` na raiz: 11 testes, lint, tipos e build aprovados. A limitação do link de dependências da worktree não ocorre na raiz.
- Smoke do Next em produção: página respondeu HTTP 200 com o proxy ativo e Cache-Control private, no-store; servidor de teste encerrado após a conferência.
- 32 verificações reais de autenticação aprovadas também no cloud v2; o teste chama o comando administrativo real para criar Gestor e Manutentor.
- Suite SQL de integridade anterior aprovada em local e cloud, com fixtures adaptadas à associação automática. Reprodução integral da migration final dentro de transação seguida da suite também aprovada nos dois ambientes, com rollback.
- 24 verificações reais da API aprovadas em cada ambiente, incluindo o novo SELECT do próprio perfil e o bloqueio de escrita e das outras tabelas.
- Migration `20261111231601` registrada nos dois ambientes. O MCP atribuiu versão cloud inicial `20261111231658`, alinhada ao arquivo após aplicação; a correção do trigger foi aplicada antes do aceite dos testes e reproduzida pela migration final.
- Cloud: projeto exclusivo `wvdqynbngsveqyzsphre`. Confirm email desligado no painel após confirmação explícita do usuário no momento da alteração. Cadastro sem confirmação e entrada imediata comprovados pela suite pública real.
- Política de senha observada: mínimo de seis caracteres; proteção de senhas vazadas indisponível no plano gratuito. Não houve contratação de plano nem mudança de senha de pessoas.
- Advisors de segurança: somente informações esperadas sobre RLS sem políticas em solicitações/histórico, que permanecem fechados até o MVP-02; nenhuma nova vulnerabilidade apontada. [Referência do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Limpeza conferida por SQL: zero contas, perfis e sessões no cloud; zero contas e perfis locais após remover as fixtures. Segredo administrativo existente foi usado somente em processo privado de teste e seu arquivo temporário foi removido. Nenhuma credencial integra Git ou este arquivo.

## Verificação adicional em navegador real

Harness temporário fora do repositório compilou o módulo `createAuth` e o cliente exportado `createBrowserSupabaseClient`, sem adicionar tela ou endpoint ao produto. No Safari, contra Supabase local real:

1. Estado inicial desconectado; cadastro pela interface pública resultou em sessão e perfil Cliente.
2. Fechar a aba e abrir novamente a página restaurou a sessão sem login.
3. Uma segunda aba reconheceu a mesma sessão.
4. Logout na segunda aba retornou estado desconectado e evento SIGNED_OUT; a primeira aba também recebeu o evento e sua consulta de contexto retornou not_authenticated.

A fixture foi removida, as abas e o servidor temporários foram encerrados. Esse teste comprova reabertura de página e saída entre abas; não encerrou o processo Safari nem simula inatividade de longa duração. A suite automatizada verifica cookies persistentes e renovação real, sem esperar horas por expiração.

## Revisão em dois eixos

- Standards: zero violações documentadas ou smells acionáveis.
- Spec: zero defeitos bloqueantes ou desvios de escopo. A revisão identificou a limitação da simulação por Map na suite; a verificação adicional acima exercitou o cliente de navegador real.
- O adaptador de Server Components não possui uma rota de teste própria; não foi criado endpoint técnico no produto para ampliar a cobertura.
