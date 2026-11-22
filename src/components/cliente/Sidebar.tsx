"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutForm } from "../../app/conta/form";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
    const pathname = usePathname();
    const solicitacoesHref = "/solicitacoes";
    const novoHref = "/solicitacoes/nova";
    const itens = [
        { href: "/", texto: "Visão geral", icone: "▦", ativo: pathname === "/" },
        { href: solicitacoesHref, texto: "Minhas solicitações", icone: "▤", ativo: pathname.startsWith(solicitacoesHref) && pathname !== novoHref },
        { href: novoHref, texto: "Nova solicitação", icone: "＋", ativo: pathname === novoHref },
    ];
    return (
        <aside className={styles.sidebar}>
        <div className={styles.logo}>
            <span className={styles.logoIcon}>✚</span>

            <div>
                <strong>FixIt</strong>
                <p>MANUTENÇÃO SIMPLIFICADA</p>
                </div>
            </div>

            <nav className={styles.menu} aria-label="Navegação do Cliente">
                {itens.map((item) => (
                    <Link key={item.href} href={item.href} aria-current={item.ativo ? "page" : undefined}>
                        <span aria-hidden="true">{item.icone}</span>{item.texto}
                    </Link>
                ))}
            </nav>
        <div className ={styles.footer}>
            <div className={styles.identificacao}>
                <strong>FixIt</strong>
                <p>Sistema de gerenciamento de manutenção</p>
            </div>
            <div className={styles.saida}>
                <LogoutForm />
            </div>
        </div>
    </aside>
    );
}
