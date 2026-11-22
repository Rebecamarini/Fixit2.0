import type { Solicitacao } from "../../lib/painel/dados";
import { NOME_PRIORIDADE, NOME_STATUS } from "../../lib/painel/regras";
import type { Chamado } from "./TabelaChamados";

export function linhasDaTabela(itens: Solicitacao[]): Chamado[] {
  return itens.map(item => ({ id: item.id, numero: item.numero, assunto: item.titulo, local: item.local,
    solicitante: item.solicitante?.nome ?? "Cliente", status: NOME_STATUS[item.status] as Chamado["status"],
    prioridade: item.prioridade ? NOME_PRIORIDADE[item.prioridade] : "Não definida", data: item.created_at }));
}
