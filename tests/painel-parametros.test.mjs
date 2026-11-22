import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizarFiltros, idSolicitacaoValido } from '../src/lib/painel/parametros.ts';

test('filtros aceitam status conhecido e página inteira positiva', () => {
  assert.deepEqual(normalizarFiltros({ status: 'pendente', pagina: '2' }), { status: 'pendente', pagina: 2 });
  for (const pagina of ['-1', '0', '1.5', 'Infinity', '999999999999', 'abc', ['2', '3']]) {
    assert.deepEqual(normalizarFiltros({ status: 'invalido', pagina }), { status: null, pagina: 1 });
  }
  assert.deepEqual(normalizarFiltros({ status: ['pendente', 'aprovada'] }), { status: null, pagina: 1 });
});

test('detalhe recusa identificadores que não são UUIDs', () => {
  assert.equal(idSolicitacaoValido('nao-existe'), false);
  assert.equal(idSolicitacaoValido('00000000-0000-0000-0000-000000000001'), true);
});
