// Server Actions: funções que rodam no SERVIDOR quando um formulário é enviado.
// Cada uma confere quem está logado e chama uma função (RPC) do banco.
// O banco valida tudo de novo e grava o histórico automaticamente.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuth } from "../../lib/auth";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { buscarUsuarioDaEquipe } from "../../lib/painel/dados";
import { mensagemDeErro } from "../../lib/painel/regras";

// O que a tela recebe de volta para mostrar a mensagem
export type Resposta = { ok: boolean; mensagem: string } | null;

export async function entrar(_anterior: Resposta, form: FormData): Promise<Resposta> {
  const supabase = await createServerSupabaseClient();
  const auth = createAuth(supabase);
  const resultado = await auth.signIn({ email: form.get("email"), password: form.get("senha") });

  if (!resultado.ok) {
    const mensagem = resultado.error === "unavailable"
      ? "Não foi possível acessar o serviço. Tente novamente mais tarde."
      : resultado.error === "profile_missing" || resultado.error === "profile_inactive"
        ? "Seu perfil não tem acesso ao painel. Procure o responsável pelo sistema."
        : "E-mail ou senha incorretos.";
    return { ok: false, mensagem };
  }
  if (resultado.profile.papel === "cliente") {
    await auth.signOut();
    return { ok: false, mensagem: "O painel é só para Gestor e Manutentor." };
  }
  redirect("/painel/solicitacoes");
}

export async function sair(): Promise<Resposta> {
  const supabase = await createServerSupabaseClient();
  const resultado = await createAuth(supabase).signOut();
  if (!resultado.ok) {
    return { ok: false, mensagem: "Não foi possível sair. Sua sessão pode continuar ativa. Tente novamente." };
  }
  redirect("/painel/entrar");
}

// MVP-06 e MVP-09: aprovar, descartar, iniciar atendimento e concluir.
export async function mudarStatus(_anterior: Resposta, form: FormData): Promise<Resposta> {
  const usuario = await buscarUsuarioDaEquipe();
  if (!usuario) return { ok: false, mensagem: "Sessão expirada. Entre novamente." };

  const id = String(form.get("id"));
  const { error } = await usuario.supabase.rpc("transicionar_solicitacao", {
    p_id: id,
    p_status: form.get("status"),
  });

  revalidatePath(`/painel/solicitacoes/${id}`); // recarrega a página com os dados novos
  if (error) return { ok: false, mensagem: mensagemDeErro(error.code) };
  return { ok: true, mensagem: "Status atualizado." };
}

// MVP-07: definir prioridade e Manutentor responsável.
export async function salvarOrganizacao(_anterior: Resposta, form: FormData): Promise<Resposta> {
  const usuario = await buscarUsuarioDaEquipe();
  if (!usuario) return { ok: false, mensagem: "Sessão expirada. Entre novamente." };

  const id = String(form.get("id"));
  // No <select>, a opção "não definida" tem valor "". O banco espera null.
  const prioridade = form.get("prioridade") || null;
  const responsavel = form.get("responsavel") || null;

  const { error } = await usuario.supabase.rpc("organizar_solicitacao", {
    p_id: id,
    p_prioridade: prioridade,
    p_responsavel_id: responsavel,
  });

  revalidatePath(`/painel/solicitacoes/${id}`);
  if (error) return { ok: false, mensagem: mensagemDeErro(error.code) };
  return { ok: true, mensagem: "Prioridade e responsável salvos." };
}

// MVP-10: registrar uma observação no histórico.
export async function adicionarObservacao(_anterior: Resposta, form: FormData): Promise<Resposta> {
  const usuario = await buscarUsuarioDaEquipe();
  if (!usuario) return { ok: false, mensagem: "Sessão expirada. Entre novamente." };

  const id = String(form.get("id"));
  const texto = String(form.get("observacao")).trim();
  if (texto === "") return { ok: false, mensagem: "Escreva a observação." };

  const { error } = await usuario.supabase.rpc("adicionar_observacao", { p_id: id, p_observacao: texto });

  revalidatePath(`/painel/solicitacoes/${id}`);
  if (error) return { ok: false, mensagem: mensagemDeErro(error.code) };
  return { ok: true, mensagem: "Observação registrada." };
}
