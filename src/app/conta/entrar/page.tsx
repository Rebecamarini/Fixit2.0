import Link from "next/link";
import { AccountForm } from "../form";
import styles from "../form.module.css";

export default function LoginPage() {
  return <main className={styles.loginPage}>
    <section className={styles.loginCard} aria-labelledby="login-title">
      <Link href="/" className={styles.logo}>
        <span className={styles.logoIcon}>✚</span>FixIt</Link>
      <h1 id="login-title">Bem-vindo de volta!</h1>
      <p className={styles.subtitulo}>Faça login na sua conta para continuar.</p>
      <AccountForm />
    </section>
  </main>;
}
