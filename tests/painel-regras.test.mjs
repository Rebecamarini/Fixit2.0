// Testes das regras do painel: quem pode fazer o quê em cada status.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acoesPermitidas, mensagemDeErro } from '../src/lib/painel/regras.ts';

const gestor = { id: 'g1', papel: 'gestor' };
const marcos = { id: 'm1', papel: 'manutentor' };
const nina = { id: 'm2', papel: 'manutentor' };

// Solicitação atribuída ao Marcos, com o status escolhido
const solicitacao = status => ({ status, prioridade: 'alta', responsavel_id: 'm1' });

test('Gestor aprova ou descarta só solicitações pendentes', () => {
  assert.equal(acoesPermitidas(gestor, solicitacao('pendente')).aprovarOuDescartar, true);
  assert.equal(acoesPermitidas(gestor, solicitacao('aprovada')).aprovarOuDescartar, false);
  assert.equal(acoesPermitidas(marcos, solicitacao('pendente')).aprovarOuDescartar, false);
});

test('Gestor define prioridade e responsável em aprovada e em atendimento', () => {
  assert.equal(acoesPermitidas(gestor, solicitacao('aprovada')).organizar, true);
  assert.equal(acoesPermitidas(gestor, solicitacao('em_atendimento')).organizar, true);
  assert.equal(acoesPermitidas(gestor, solicitacao('pendente')).organizar, false);
  assert.equal(acoesPermitidas(marcos, solicitacao('aprovada')).organizar, false);
});

test('só o Manutentor responsável inicia e conclui', () => {
  assert.equal(acoesPermitidas(marcos, solicitacao('aprovada')).iniciar, true);
  assert.equal(acoesPermitidas(marcos, solicitacao('em_atendimento')).concluir, true);
  assert.equal(acoesPermitidas(nina, solicitacao('aprovada')).iniciar, false);
  assert.equal(acoesPermitidas(gestor, solicitacao('em_atendimento')).concluir, false);
});

test('observações: Gestor ou responsável, enquanto não estiver encerrada', () => {
  assert.equal(acoesPermitidas(gestor, solicitacao('pendente')).observar, true);
  assert.equal(acoesPermitidas(marcos, solicitacao('em_atendimento')).observar, true);
  assert.equal(acoesPermitidas(nina, solicitacao('em_atendimento')).observar, false);
  assert.equal(acoesPermitidas(gestor, solicitacao('concluida')).observar, false);
  assert.equal(acoesPermitidas(marcos, solicitacao('descartada')).observar, false);
});

// Sem código do banco, a resposta pode ter se perdido depois da gravação.
test('falha de transporte orienta conferir o histórico antes de reenviar', () => {
  assert.equal(
    mensagemDeErro(undefined),
    'Não foi possível confirmar a operação. Confira os dados e o histórico atualizados antes de enviar novamente.',
  );
  assert.equal(
    mensagemDeErro('42501'),
    'Você não pode fazer essa ação agora. A página foi atualizada.'
  );
});
