// Formulários do painel. São "client components" porque mostram mensagens
// e o estado "Salvando..." enquanto a Server Action roda.
"use client";

import { useActionState } from "react";
import { LISTA_PRIORIDADES, NOME_PRIORIDADE, type Status } from "../../lib/painel/regras";
import type { Pessoa } from "../../lib/painel/dados";
import {
  adicionarObservacao,
  entrar,
  mudarStatus,
  salvarOrganizacao,
  sair,
  type Resposta
} from "./acoes";
import estilos from "./painel.module.css";

function Mensagem({ resposta }: { resposta: Resposta }) {
  if (!resposta) return null;
  return <p role="status" className={resposta.ok ? estilos.mensagemOk : estilos.mensagemErro}>{resposta.mensagem}</p>;
}

export function FormEntrar() {
  // useActionState: guarda a resposta da action e diz se ela ainda está rodando
  const [resposta, acao, carregando] = useActionState(entrar, null);
  return (
    <form action={acao}>
      <label className={estilos.campo}>
        E-mail
        <input name="email" type="email" required />
      </label>
      <label className={estilos.campo}>
        Senha
        <input name="senha" type="password" required />
      </label>
      <button className={estilos.botao} disabled={carregando}>{carregando ? "Entrando..." : "Entrar"}</button>
      <Mensagem resposta={resposta} />
    </form>
  );
}

export function FormSair() {
  const [resposta, acao, carregando] = useActionState(sair, null);
  return (
    <form action={acao}>
      <button disabled={carregando}>{carregando ? "Saindo..." : "Sair"}</button>
      <Mensagem resposta={resposta} />
    </form>
  );
}

// Um botão que muda o status. Pede confirmação antes de enviar (MVP-06).
export function BotaoStatus(props: {
  id: string;
  status: Status;
  texto: string;
  confirmacao: string;
  perigo?: boolean
}) {
  const [resposta, acao, carregando] = useActionState(mudarStatus, null);
  return (
    <form
      action={acao}
      onSubmit={evento => {
        if (!window.confirm(props.confirmacao)) evento.preventDefault(); // cancelou: não envia
      }}
    >
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="status" value={props.status} />
      <button className={props.perigo ? estilos.botaoPerigo : estilos.botao} disabled={carregando}>
        {carregando ? "Salvando..." : props.texto}
      </button>
      <Mensagem resposta={resposta} />
    </form>
  );
}

// MVP-07: prioridade + responsável. O banco espera sempre os dois valores juntos.
export function FormOrganizar(props: {
  id: string;
  prioridade: string | null;
  responsavelId: string | null;
  responsavelAtual: Pessoa | null;
  manutentores: Pessoa[];
}) {
  const [resposta, acao, carregando] = useActionState(salvarOrganizacao, null);
  return (
    <form action={acao}>
      <input type="hidden" name="id" value={props.id} />
      <label className={estilos.campo}>
        Prioridade
        <select name="prioridade" defaultValue={props.prioridade ?? ""}>
          <option value="">Não definida</option>
          {LISTA_PRIORIDADES.map(p => (
            <option key={p} value={p}>{NOME_PRIORIDADE[p]}</option>
          ))}
        </select>
      </label>
      <label className={estilos.campo}>
        Manutentor responsável
        <select name="responsavel" defaultValue={props.responsavelId ?? ""}>
          <option value="">Sem responsável</option>
          {props.responsavelId && !props.manutentores.some(m => m.id === props.responsavelId) && (
            <option value={props.responsavelId}>
              {props.responsavelAtual?.nome ?? "Responsável atual"} (inativo)
            </option>
          )}
          {props.manutentores.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </label>
      <button className={estilos.botao} disabled={carregando}>{carregando ? "Salvando..." : "Salvar"}</button>
      <Mensagem resposta={resposta} />
    </form>
  );
}

// MVP-10: nova observação. Depois de enviada, entra no histórico e não pode ser apagada.
export function FormObservacao({ id }: { id: string }) {
  const [resposta, acao, carregando] = useActionState(adicionarObservacao, null);
  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      <label className={estilos.campo}>
        Nova observação
        <textarea name="observacao" maxLength={5000} required />
      </label>
      <button className={estilos.botao} disabled={carregando}>{carregando ? "Salvando..." : "Registrar observação"}</button>
      <Mensagem resposta={resposta} />
    </form>
  );
}
