// Tela de login do painel (Gestor e Manutentor).
import { redirect } from "next/navigation";
import { buscarUsuarioDaEquipe } from "../../../lib/painel/dados";
import { FormEntrar } from "../formularios";
import estilos from "../../conta/form.module.css";

export default async function PaginaEntrar() {
  // Se já está logado, vai direto para a lista
  if (await buscarUsuarioDaEquipe()) redirect("/painel/solicitacoes");

  return (
    <main className={estilos.loginPage}>
      <div className={estilos.loginCard}>
        <div className={estilos.logo}><span className={estilos.logoIcon} aria-hidden="true">✚</span>FixIt</div>
        <h1>Acesso da equipe</h1>
        <p className={estilos.subtitulo}>Acesso para Gestor e Manutentor.</p>
        <FormEntrar />
      </div>
    </main>
  );
}
