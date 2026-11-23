import Link from "next/link";
import { exigirCliente } from "../lib/cliente/dados";
import { consultarSolicitacoes } from "../lib/cliente/consultas";
import { linhasDaTabela } from "../components/cliente/linhas";
import ClienteLayout from "../components/cliente/ClienteLayout";
import Cards from "../components/cliente/Cards";
import TabelaChamados from "../components/cliente/TabelaChamados";
import styles from "../components/cliente/ClienteLayout.module.css";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { client, perfil } = await exigirCliente();
  const itens = await consultarSolicitacoes(client, perfil.id);
  const indicadores = [
    { titulo: "Total", valor: itens.length, icone: "▤" },
    { titulo: "Pendentes", valor: itens.filter(item => item.status === "pendente").length, icone: "◷" },
    { titulo: "Em atendimento", valor: itens.filter(item => item.status === "em_atendimento").length, icone: "⚙" },
    { titulo: "Concluídas", valor: itens.filter(item => item.status === "concluida").length, icone: "✓" },
  ];
  return <ClienteLayout nome={perfil.nome}>
    <div className={styles.boasVindas}><div><span className={styles.eyebrow}>FixIt</span><h1>Olá, {perfil.nome}!</h1><p>Acompanhe as solicitações de manutenção que você abriu.</p></div>
      <Link className={styles.novoChamado} href="/solicitacoes/nova">＋ Nova solicitação</Link></div>
    <div className={styles.indicadores}>{indicadores.map(item => <Cards key={item.titulo} {...item} />)}</div>
    <TabelaChamados chamados={linhasDaTabela(itens.slice(0, 5))} />
  </ClienteLayout>;
}
