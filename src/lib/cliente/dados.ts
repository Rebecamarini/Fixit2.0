import "server-only";
import { redirect } from "next/navigation";
import { createAuth } from "../auth";
import { createServerSupabaseClient } from "../supabase/server";

export async function exigirCliente() {
  const client = await createServerSupabaseClient();
  const resultado = await createAuth(client).context();
  if (!resultado.ok) {
    if (resultado.error === "unavailable") throw new Error("Serviço temporariamente indisponível.");
    redirect("/conta/entrar");
  }
  if (resultado.profile.papel !== "cliente") redirect("/painel/solicitacoes");
  return { client, perfil: resultado.profile };
}
