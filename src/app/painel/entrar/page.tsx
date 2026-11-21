// Tela de login do painel (Gestor e Manutentor).
import { redirect } from "next/navigation";
import { buscarUsuarioDaEquipe } from "../../../lib/painel/dados";
import { FormEntrar } from "../formularios";
import estilos from "../painel.module.css";

export default async function PaginaEntrar() {
  // Se já está logado, vai direto para a lista
  if (await buscarUsuarioDaEquipe()) redirect("/painel/solicitacoes");

  return (
    <main className={estilos.telaEntrar}>
      <h1>FixIt · Painel</h1>
      <p>Acesso para Gestor e Manutentor.</p>
      <FormEntrar />
    </main>
  );
}
