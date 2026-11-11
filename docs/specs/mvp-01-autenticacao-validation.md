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

Aplicação cloud, regressões de banco, revisão e build final serão registrados
na consolidação da branch de integração. Nenhuma credencial integra este arquivo.
