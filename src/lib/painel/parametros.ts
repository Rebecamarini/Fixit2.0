import { ITENS_POR_PAGINA, LISTA_STATUS, type Status } from "./regras.ts";

type Parametros = { status?: string | string[]; pagina?: string | string[] };

export function normalizarFiltros(parametros: Parametros) {
  const status = typeof parametros.status === "string" && LISTA_STATUS.includes(parametros.status as Status)
    ? parametros.status as Status
    : null;
  const numero = typeof parametros.pagina === "string" ? Number(parametros.pagina) : NaN;
  // PostgREST usa offsets inteiros de 32 bits.
  const paginaMaxima = Math.floor(2_147_483_647 / ITENS_POR_PAGINA);
  const pagina = Number.isInteger(numero) && numero >= 1 && numero <= paginaMaxima ? numero : 1;

  return { status, pagina };
}

export function idSolicitacaoValido(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
