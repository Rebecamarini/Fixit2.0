import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCliente } from "../../../lib/cliente/dados";
import { consultarSolicitacao } from "../../../lib/cliente/consultas";
import { buscarHistorico } from "../../../lib/painel/dados";
import { NOME_STATUS, NOME_PRIORIDADE, formatarData } from "../../../lib/painel/regras";
import { Historico } from "../../painel/componentes";
import ClienteLayout from "../../../components/cliente/ClienteLayout";
import styles from "./page.module.css";

export default async function Detalhes({ params }: { params: Promise<{ id: string }> }) {
  const { client, perfil } = await exigirCliente();
  const { id } = await params;
  const item = await consultarSolicitacao(client, perfil.id, id);
  if (!item) notFound();
  const eventos = await buscarHistorico(client, item.id);
  return <ClienteLayout nome={perfil.nome}>
    <Link className={styles.voltar} href="/solicitacoes">← Minhas solicitações</Link>
    <section className={styles.card}>
      <header className={styles.cabecalho}>
        <div>
          <p className={styles.numero}>Solicitação #{item.numero}</p>
          <h2>{item.titulo}</h2>
        </div>
        <span className={styles.status}>{NOME_STATUS[item.status]}</span>
      </header>
      <dl className={styles.informacoes}>
        <div>
          <dt>Localização</dt>
          <dd>{item.local}</dd>
        </div>
        <div>
          <dt>Abertura</dt>
          <dd>{formatarData(item.created_at)}</dd>
        </div>
        <div>
          <dt>Prioridade</dt>
          <dd>{item.prioridade ? NOME_PRIORIDADE[item.prioridade] : "Não definida"}</dd>
        </div>
        <div>
          <dt>Responsável</dt>
          <dd>{item.responsavel?.nome ?? "Não atribuído"}</dd>
        </div>
      </dl>
      <div className={styles.descricao}>
        <h3>Descrição</h3>
        <p>{item.descricao}</p>
      </div>
    </section>
    <section className={styles.card}>
      <h2>Acompanhamento e histórico</h2>
      {eventos.length ? <Historico eventos={eventos} /> : <p>Nenhum evento disponível.</p>}
    </section>
  </ClienteLayout>;
}
