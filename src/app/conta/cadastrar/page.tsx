import Link from "next/link";
import { AccountForm } from "../form";
import styles from "../form.module.css";

export default function CadastroPage() {
  return <main className={styles.loginPage}><section className={styles.loginCard} aria-labelledby="cadastro-title">
    <Link href="/" className={styles.logo}><span className={styles.logoIcon}>✚</span>FixIt</Link>
    <h1 id="cadastro-title">Crie sua conta</h1><p className={styles.subtitulo}>Cadastre-se para solicitar e acompanhar manutenções.</p>
    <AccountForm cadastro />
  </section></main>;
}
