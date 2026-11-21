// Detalhes de uma solicitação + ações (MVP-06, 07, 09 e 10) + histórico.
import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarHistorico, buscarSolicitacao, exigirUsuarioDaEquipe, listarManutentores } from "../../../../../lib/painel/dados";
import { acoesPermitidas, formatarData } from "../../../../../lib/painel/regras";
import { Historico, SeloPrioridade, SeloStatus } from "../../../componentes";
import { BotaoStatus, FormObservacao, FormOrganizar } from "../../../formularios";
import estilos from "../../../painel.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function PaginaDetalhe({ params }: Props) {
  const { id } = await params;
  const { supabase, perfil } = await exigirUsuarioDaEquipe();

  const solicitacao = await buscarSolicitacao(supabase, id);
  if (!solicitacao) notFound(); // não existe ou o usuário não tem acesso (RLS)

  const historico = await buscarHistorico(supabase, id);
  const acoes = acoesPermitidas(perfil, solicitacao);
  const manutentores = acoes.organizar ? await listarManutentores(supabase) : [];

  return (
    <>
      <Link href="/painel/solicitacoes">← Voltar</Link>
      <h1>
        #{solicitacao.numero} {solicitacao.titulo} <SeloStatus status={solicitacao.status} />
      </h1>

      <div className={estilos.colunas}>
        <div>
          <section className={estilos.cartao}>
            <h2>Dados</h2>
            <p><b>Solicitante:</b> {solicitacao.solicitante?.nome}</p>
            <p><b>Local:</b> {solicitacao.local}</p>
            <p><b>Aberta em:</b> {formatarData(solicitacao.created_at)}</p>
            <p><b>Prioridade:</b> <SeloPrioridade prioridade={solicitacao.prioridade} /></p>
            <p><b>Responsável:</b> {solicitacao.responsavel?.nome ?? "Sem responsável"}</p>
            <p><b>Descrição:</b> {solicitacao.descricao}</p>
          </section>

          <section className={estilos.cartao}>
            <h2>Histórico</h2>
            <Historico eventos={historico} />
          </section>
        </div>

        <section className={estilos.cartao}>
          <h2>Ações</h2>

          {acoes.aprovarOuDescartar && (
            <div className={estilos.botoes}>
              <BotaoStatus id={id} status="aprovada" texto="Aprovar" confirmacao="Aprovar esta solicitação?" />
              <BotaoStatus id={id} status="descartada" texto="Descartar" perigo confirmacao="Descartar esta solicitação? Não dá para desfazer." />
            </div>
          )}

          {acoes.organizar && (
            <FormOrganizar
              id={id}
              prioridade={solicitacao.prioridade}
              responsavelId={solicitacao.responsavel_id}
              manutentores={manutentores}
            />
          )}

          {acoes.iniciar && (
            <BotaoStatus id={id} status="em_atendimento" texto="Iniciar atendimento" confirmacao="Iniciar o atendimento?" />
          )}

          {acoes.concluir && (
            <BotaoStatus id={id} status="concluida" texto="Concluir chamado" confirmacao="Concluir o chamado? Ele será encerrado." />
          )}

          {acoes.observar && <FormObservacao id={id} />}

          {!Object.values(acoes).includes(true) && <p className={estilos.vazio}>Nenhuma ação disponível.</p>}
        </section>
      </div>
    </>
  );
}
