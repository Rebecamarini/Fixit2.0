"use client";

import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

type HeaderProps = {
  nome: string;
};

export default function Header({ nome }: HeaderProps) {
  const pathname = usePathname();

  const paginas: Record<string, string> = {
    "/solicitacoes": "Minhas solicitações",
    "/solicitacoes/nova": "Nova solicitação",

  };
    const paginaAtual = paginas[pathname] ?? "Detalhes da solicitação";
    return(
        <header className ={styles.header}>
            <div className={styles.breadcrumb}>
            <span>FixIt</span>
            <span aria-hidden="true">/</span>
            <span>{paginaAtual}</span>
            </div>

            <div className={styles.usuario}>
            <span className={styles.nome}>Cliente · {nome}</span>

            <div className={styles.avatar} aria-hidden="true">
            {nome.charAt(0).toUpperCase()}
            </div>
         </div>
     </header>
    );
}
