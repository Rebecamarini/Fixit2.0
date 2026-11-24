import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./ClienteLayout.module.css";

export default function ClienteLayout({ nome, children }: { nome: string; children: ReactNode }) {
  return <div className={styles.layout}>
    <div className={styles.sidebar}>
      <Sidebar />
    </div>
    <div className={styles.topo}>
      <Header nome={nome} />
    </div>
    <main className={styles.main}>{children}</main>
  </div>;
}
