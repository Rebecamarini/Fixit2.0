"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { autenticar, sair } from "./actions";
import styles from "./form.module.css";

export function AccountForm({ cadastro = false }: { cadastro?: boolean }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [estado, action, pending] = useActionState(async (anterior: Awaited<ReturnType<typeof autenticar>>, data: FormData) => {
    setSenha("");
    return autenticar(cadastro, anterior, data);
  }, null);
  return <form action={action} className={styles.form} aria-busy={pending}>
    {cadastro && <div><label htmlFor="nome">Nome</label><input id="nome" name="nome" required maxLength={120} autoComplete="name" value={nome} onChange={event => setNome(event.target.value)} /></div>}
    <div><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></div>
    <div><label htmlFor="senha">Senha</label><input id="senha" name="senha" type={mostrarSenha ? "text" : "password"} required autoComplete={cadastro ? "new-password" : "current-password"} value={senha} onChange={event => setSenha(event.target.value)} />
      <label className={styles.checkbox}><input type="checkbox" checked={mostrarSenha} onChange={event => setMostrarSenha(event.target.checked)} />Mostrar senha</label></div>
    {estado && <p role="alert" className={styles.error}>{estado.mensagem}</p>}
    <button disabled={pending}>{pending ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"}</button>
    <Link href={cadastro ? "/conta/entrar" : "/conta/cadastrar"}>{cadastro ? "Já tenho conta" : "Criar uma conta"}</Link>
    <Link href="/painel/entrar">Acesso da equipe</Link>
  </form>;
}

export function LogoutForm() {
  const [estado, action, pending] = useActionState(sair, null);
  return <form action={action}><button disabled={pending}>{pending ? "Saindo…" : "Sair"}</button>{estado && <p role="alert">{estado.mensagem}</p>}</form>;
}
