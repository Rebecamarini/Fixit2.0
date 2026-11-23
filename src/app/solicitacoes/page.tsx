import Link from "next/link";
import { exigirCliente } from "../../lib/cliente/dados";
import { consultarSolicitacoes, filtrarSolicitacoes } from "../../lib/cliente/consultas";
import { NOME_STATUS, LISTA_STATUS, ITENS_POR_PAGINA } from "../../lib/painel/regras";
import ClienteLayout from "../../components/cliente/ClienteLayout";
import TabelaChamados from "../../components/cliente/TabelaChamados";
import { linhasDaTabela } from "../../components/cliente/linhas";
import layout from "../../components/cliente/ClienteLayout.module.css";
import styles from "./page.module.css";

export default async function MinhasSolicitacoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const busca = typeof parametros.busca === "string" ? parametros.busca : "";
  const estado = typeof parametros.estado === "string" && LISTA_STATUS.includes(parametros.estado as typeof LISTA_STATUS[number]) ? parametros.estado : "";
  const numero = typeof parametros.pagina === "string" ? Number(parametros.pagina) : 1;
  const paginaPedida = Number.isSafeInteger(numero) && numero > 0 ? numero : 1;
  const { client, perfil } = await exigirCliente();
  const itens = filtrarSolicitacoes(await consultarSolicitacoes(client, perfil.id), busca, estado);
  const paginas = Math.max(1, Math.ceil(itens.length / ITENS_POR_PAGINA));
  const pagina = Math.min(paginaPedida, paginas);
  const linhas = linhasDaTabela(itens.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA));
  const href = (valor: number) => `/solicitacoes?${new URLSearchParams({ busca, estado, pagina: String(valor) })}`;
  return <ClienteLayout nome={perfil.nome}>
    <div className={layout.boasVindas}><div><h1>Minhas solicitações</h1><p>Consulte e acompanhe seus atendimentos.</p></div><Link className={layout.novoChamado} href="/solicitacoes/nova">＋ Nova solicitação</Link></div>
    <TabelaChamados chamados={linhas} variante="todos">
      <form className={styles.filtros} action="/solicitacoes">
        <div className={styles.busca}><label htmlFor="busca">Pesquisar solicitações</label><input id="busca" name="busca" type="search" defaultValue={busca} placeholder="Número, título ou localização" /></div>
        <div className={styles.status}><label htmlFor="estado">Status</label><select id="estado" name="estado" defaultValue={estado}><option value="">Todos os status</option>{LISTA_STATUS.map(valor => <option key={valor} value={valor}>{NOME_STATUS[valor]}</option>)}</select></div>
        <button className={layout.novoChamado}>Pesquisar</button><Link href="/solicitacoes">Limpar filtros</Link>
      </form><p className={styles.resultados} role="status">{itens.length} solicitações encontradas</p>
    </TabelaChamados>
    {paginas > 1 && <nav className={styles.pagination} aria-label="Paginação das solicitações">
      {pagina > 1 && <Link href={href(pagina - 1)}>Página anterior</Link>}<p>Página {pagina} de {paginas}</p>{pagina < paginas && <Link href={href(pagina + 1)}>Próxima página</Link>}
    </nav>}
  </ClienteLayout>;
}
