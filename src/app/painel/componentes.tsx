// Pedaços de tela reaproveitados na lista e nos detalhes.
import { NOME_PRIORIDADE, NOME_STATUS, formatarData, type Prioridade, type Status } from "../../lib/painel/regras";
import type { Evento } from "../../lib/painel/dados";
import estilos from "./painel.module.css";

export function SeloStatus({ status }: { status: Status }) {
  return <span className={`${estilos.selo} ${estilos[status]}`}>{NOME_STATUS[status]}</span>;
}

export function SeloPrioridade({ prioridade }: { prioridade: Prioridade | null }) {
  if (!prioridade) return <span className={estilos.vazio}>Não definida</span>;
  return <span className={`${estilos.selo} ${estilos[prioridade]}`}>{NOME_PRIORIDADE[prioridade]}</span>;
}

// Transforma um evento do histórico em uma frase.
function descreverEvento(evento: Evento): string {
  if (evento.tipo === "abertura") return "Abriu a solicitação.";
  if (evento.tipo === "observacao") return "Escreveu uma observação:";
  if (evento.tipo === "alteracao_status") {
    return `Mudou o status de ${NOME_STATUS[evento.status_anterior!]} para ${NOME_STATUS[evento.status_novo!]}.`;
  }
  if (evento.tipo === "alteracao_prioridade") {
    const nova = evento.prioridade_nova ? NOME_PRIORIDADE[evento.prioridade_nova] : "não definida";
    return `Mudou a prioridade para ${nova}.`;
  }
  // alteracao_responsavel
  return evento.responsavel_novo ? `Atribuiu a ${evento.responsavel_novo.nome}.` : "Removeu o responsável.";
}

export function Historico({ eventos }: { eventos: Evento[] }) {
  return (
    <ol className={estilos.historico}>
      {eventos.map(evento => (
        <li key={evento.id}>
          <small>{formatarData(evento.created_at)} · {evento.autor?.nome}</small>
          <p>{descreverEvento(evento)}</p>
          {evento.observacao && <blockquote>{evento.observacao}</blockquote>}
        </li>
      ))}
    </ol>
  );
}
