"use client";
import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { enviar } from "./actions";
import styles from "./form.module.css";

export default function FormularioSolicitacao() {
  const [estado, action, pending] = useActionState(enviar, null);
  const [preenchido, setPreenchido] = useState(false);
  const [dados, setDados] = useState({ titulo: "", local: "", descricao: "" });
  const dialog = useRef<HTMLDialogElement>(null);
  return <form className={styles.form} action={action} aria-busy={pending} onChange={() => setPreenchido(true)}>
    <fieldset disabled={pending || !!estado?.id || !!estado?.incerto}>
      <legend>Dados da solicitação</legend>
      <div><label htmlFor="titulo">Título</label><textarea id="titulo" name="titulo" required maxLength={150} rows={2} value={dados.titulo} onChange={event => setDados({ ...dados, titulo: event.target.value })} /></div>
      <div><label htmlFor="local">Local</label><textarea id="local" name="local" required maxLength={200} rows={2} value={dados.local} onChange={event => setDados({ ...dados, local: event.target.value })} /></div>
      <div><label htmlFor="descricao">Descrição</label><textarea id="descricao" name="descricao" required maxLength={5000} rows={6} value={dados.descricao} onChange={event => setDados({ ...dados, descricao: event.target.value })} /></div>
      <button type="submit">{pending ? "Enviando…" : "Enviar solicitação"}</button>
    </fieldset>
    {estado && <p role={estado.id ? "status" : "alert"}>{estado.mensagem}</p>}
    {estado?.id && <Link href={`/solicitacoes/${estado.id}`}>Acompanhar solicitação</Link>}
    {estado?.incerto && <Link href="/solicitacoes">Conferir minhas solicitações</Link>}
    {preenchido && !estado?.id && !estado?.incerto ? <button type="button" onClick={() => dialog.current?.showModal()}>Cancelar preenchimento</button> : <Link href="/solicitacoes">Voltar às solicitações</Link>}
    <dialog ref={dialog} className={styles.dialog}><h2>Descartar preenchimento?</h2><p>Os dados ainda não enviados serão perdidos.</p><Link href="/solicitacoes">Descartar e voltar</Link><button type="button" onClick={() => dialog.current?.close()}>Continuar preenchendo</button></dialog>
  </form>;
}
