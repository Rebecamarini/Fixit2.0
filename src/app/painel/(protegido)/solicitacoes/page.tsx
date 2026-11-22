// MVP-05: lista de solicitações com filtro por status.
// A URL guarda o filtro e a página: /painel/solicitacoes?status=pendente&pagina=2
import Link from "next/link";
import { normalizarFiltros } from "../../../../lib/painel/parametros";
import { exigirUsuarioDaEquipe, listarSolicitacoes } from "../../../../lib/painel/dados";
import { ITENS_POR_PAGINA, LISTA_STATUS, NOME_STATUS, formatarData } from "../../../../lib/painel/regras";
import { SeloPrioridade, SeloStatus } from "../../componentes";
import estilos from "../../painel.module.css";

type Props = { searchParams: Promise<{ status?: string | string[]; pagina?: string | string[] }> };

export default async function PaginaLista({ searchParams }: Props) {
  const { supabase, perfil } = await exigirUsuarioDaEquipe();
  const { status, pagina } = normalizarFiltros(await searchParams);

  // A RLS decide o que vem: Gestor recebe todas, Manutentor só as dele.
  const { solicitacoes, total } = await listarSolicitacoes(supabase, status, pagina);
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));

  // Monta o link mantendo o filtro de status
  const link = (novaPagina: number) => `?${status ? `status=${status}&` : ""}pagina=${novaPagina}`;

  return (
    <>
      <h1>{perfil.papel === "gestor" ? "Todas as solicitações" : "Minhas atribuições"}</h1>

      <nav className={estilos.filtros}>
        <Link href="/painel/solicitacoes" className={!status ? estilos.ativo : ""}>Todos</Link>
        {LISTA_STATUS.map(s => (
          <Link key={s} href={`?status=${s}`} className={status === s ? estilos.ativo : ""}>
            {NOME_STATUS[s]}
          </Link>
        ))}
      </nav>

      {solicitacoes.length === 0 ? (
        <p className={estilos.vazio}>Nenhuma solicitação encontrada.</p>
      ) : (
        <div className={estilos.tabelaRolagem}>
          <table className={estilos.tabela}>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Título</th>
                <th>Local</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Responsável</th>
                <th>Aberta em</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map(s => (
                <tr key={s.id}>
                  <td>#{s.numero}</td>
                  <td><Link href={`/painel/solicitacoes/${s.id}`}>{s.titulo}</Link></td>
                  <td>{s.local}</td>
                  <td><SeloStatus status={s.status} /></td>
                  <td><SeloPrioridade prioridade={s.prioridade} /></td>
                  <td>{s.responsavel?.nome ?? <span className={estilos.vazio}>Sem responsável</span>}</td>
                  <td>{formatarData(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={estilos.paginacao}>
        {pagina > 1 && <Link href={link(pagina - 1)}>← Anterior</Link>}
        <span>Página {pagina} de {totalPaginas} ({total} no total)</span>
        {pagina < totalPaginas && <Link href={link(pagina + 1)}>Próxima →</Link>}
      </p>
    </>
  );
}
