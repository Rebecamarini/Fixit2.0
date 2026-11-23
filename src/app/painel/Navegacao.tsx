"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NOME_PAPEL, type Papel } from "../../lib/painel/regras";
import { FormSair } from "./formularios";
import layout from "../../components/cliente/ClienteLayout.module.css";
import sidebar from "../../components/cliente/Sidebar.module.css";
import header from "../../components/cliente/Header.module.css";
import estilos from "./painel.module.css";

export default function Navegacao({ nome, papel, children }: { nome: string; papel: Papel; children: ReactNode }) {
  const pathname = usePathname();
  const listaHref = "/painel/solicitacoes";
  const tituloLista = papel === "gestor" ? "Todas as solicitações" : "Minhas atribuições";
  const paginaAtual = pathname === listaHref ? tituloLista : "Detalhes da solicitação";

  return <div className={`${layout.layout} ${estilos.painel}`}>
    <div className={layout.sidebar}>
      <aside className={sidebar.sidebar}>
        <div className={sidebar.logo}>
          <span className={sidebar.logoIcon} aria-hidden="true">✚</span>
          <div><strong>FixIt</strong><p>MANUTENÇÃO SIMPLIFICADA</p></div>
        </div>
        <nav className={sidebar.menu} aria-label="Navegação da equipe">
          <Link href={listaHref} aria-current={pathname === listaHref ? "page" : undefined}>
            <span aria-hidden="true">▤</span>{tituloLista}
          </Link>
        </nav>
        <div className={sidebar.footer}>
          <div className={sidebar.identificacao}><strong>FixIt</strong><p>Sistema de gerenciamento de manutenção</p></div>
          <div className={sidebar.saida}><FormSair /></div>
        </div>
      </aside>
    </div>
    <div className={layout.topo}>
      <header className={header.header}>
        <div className={header.breadcrumb}><span>FixIt</span><span aria-hidden="true">/</span><span>{paginaAtual}</span></div>
        <div className={header.usuario}>
          <span className={header.nome}>{NOME_PAPEL[papel]} · {nome}</span>
          <div className={header.avatar} aria-hidden="true">{nome.charAt(0).toUpperCase()}</div>
        </div>
      </header>
    </div>
    <main className={`${layout.main} ${estilos.conteudo}`}>{children}</main>
  </div>;
}
