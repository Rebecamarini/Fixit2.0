import assert from "node:assert/strict";
import { test } from "node:test";
import { consultarSolicitacao, consultarSolicitacoes, filtrarSolicitacoes, validarNovaSolicitacao } from "../src/lib/cliente/consultas.ts";

function clientDeLeitura(paginas) {
  const chamadas = [];
  const query = {
    select: () => query,
    eq: (campo, valor) => { chamadas.push([campo, valor]); return query; },
    order: () => query,
    range: async (inicio, fim) => { chamadas.push([inicio, fim]); return paginas.shift(); },
    maybeSingle: async () => paginas.shift(),
  };
  return { client: { from: () => query }, chamadas };
}

test("consulta mantém autoria explícita em todas as páginas e busca além de 500 registros", async () => {
  const anteriores = Array.from({ length: 500 }, (_, i) => ({ id: String(i), titulo: "Lâmpada", numero: i, local: "Sala", status: "pendente" }));
  const alvo = { id: "ultimo", numero: 501, titulo: "Ar-condicionado", local: "Recepção", status: "em_atendimento" };
  const { client, chamadas } = clientDeLeitura([{ data: anteriores }, { data: [alvo] }]);
  const itens = await consultarSolicitacoes(client, "cliente-atual");
  assert.equal(itens.length, 501);
  assert.deepEqual(chamadas, [["solicitante_id", "cliente-atual"], [0, 499], ["solicitante_id", "cliente-atual"], [500, 999]]);
  assert.deepEqual(filtrarSolicitacoes(itens, "RECEPCAO", "em_atendimento"), [alvo]);
  assert.deepEqual(filtrarSolicitacoes(itens, "501", ""), [alvo]);
  assert.deepEqual(filtrarSolicitacoes(itens, "Recepção", "pendente"), []);
});

test("erro de consulta não vira lista vazia e vazio real é aceito", async () => {
  await assert.rejects(() => consultarSolicitacoes(clientDeLeitura([{ error: { code: "offline" } }]).client, "cliente"));
  assert.deepEqual(await consultarSolicitacoes(clientDeLeitura([{ data: [] }]).client, "cliente"), []);
});

test("detalhes recusam UUID inválido e restringem UUID válido ao solicitante", async () => {
  assert.equal(await consultarSolicitacao({}, "cliente", "id-invalido"), null);
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const { client, chamadas } = clientDeLeitura([{ data: null }]);
  assert.equal(await consultarSolicitacao(client, "cliente", id), null);
  assert.deepEqual(chamadas, [["solicitante_id", "cliente"], ["id", id]]);
  await assert.rejects(() => consultarSolicitacao(clientDeLeitura([{ error: { code: "offline" } }]).client, "cliente", id));
});

test("abertura valida campos e limites do MVP sem encaminhar campos de gestão ou identidade", () => {
  const form = new FormData();
  assert.equal(validarNovaSolicitacao(form), null);
  form.set("titulo", "  Lâmpada queimada  ");
  form.set("descricao", " Trocar lâmpada da recepção. ");
  form.set("local", " Recepção ");
  for (const campo of ["solicitante_id", "status", "prioridade", "responsavel_id"]) form.set(campo, "forjado");
  assert.deepEqual(validarNovaSolicitacao(form), { titulo: "Lâmpada queimada", descricao: "Trocar lâmpada da recepção.", local: "Recepção" });
  for (const [campo, limite] of [["titulo", 150], ["descricao", 5000], ["local", 200]]) {
    const original = form.get(campo);
    form.set(campo, "x".repeat(limite));
    assert.ok(validarNovaSolicitacao(form));
    form.set(campo, "x".repeat(limite + 1));
    assert.equal(validarNovaSolicitacao(form), null);
    form.set(campo, "  ");
    assert.equal(validarNovaSolicitacao(form), null);
    form.set(campo, original);
  }
});
