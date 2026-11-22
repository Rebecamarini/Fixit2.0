"use server";

import { redirect } from "next/navigation";
import { createAuth } from "../../lib/auth";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export type Resposta = { mensagem: string } | null;

export async function autenticar(cadastro: boolean, _estado: Resposta, form: FormData): Promise<Resposta> {
  const auth = createAuth(await createServerSupabaseClient());
  const dados = { email: form.get("email"), password: form.get("senha") };
  const resultado = cadastro
    ? await auth.signUp({ ...dados, nome: form.get("nome") })
    : await auth.signIn(dados);
  if (!resultado.ok) {
    const mensagens = {
      invalid_input: "Confira os campos. A senha deve atender à política do serviço de autenticação.",
      invalid_credentials: "E-mail ou senha incorretos.",
      not_authenticated: "Entre novamente para continuar.",
      profile_missing: "Seu perfil não está disponível. Procure o responsável pelo sistema.",
      profile_inactive: "Seu perfil está inativo. Procure o responsável pelo sistema.",
      profile_creation_failed: "Não foi possível criar sua conta. Tente novamente.",
      signup_failed: "Não foi possível cadastrar. Confira os dados ou entre com sua conta.",
      unavailable: "Serviço temporariamente indisponível. Tente novamente mais tarde.",
    };
    return { mensagem: mensagens[resultado.error] };
  }
  redirect(resultado.profile.papel === "cliente" ? "/" : "/painel/solicitacoes");
}

export async function sair(): Promise<Resposta> {
  const resultado = await createAuth(await createServerSupabaseClient()).signOut();
  if (!resultado.ok) return { mensagem: "Não foi possível sair. Tente novamente." };
  redirect("/conta/entrar");
}
