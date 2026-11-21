// Consultas ao Supabase usadas pelo painel. Roda só no servidor.
// A RLS do banco já filtra o que cada um pode ver:
//   - Gestor vê todas as solicitações
//   - Manutentor vê só as que estão atribuídas a ele
import "server-only";

import { redirect } from "next/navigation";
import { createAuth } from "../auth";
import { createServerSupabaseClient } from "../supabase/server";
import { ITENS_POR_PAGINA, type Prioridade, type Status } from "./regras";

export type Pessoa = { id: string; nome: string };

export type Solicitacao = {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  local: string;
  status: Status;
  prioridade: Prioridade | null;
  responsavel_id: string | null;
  created_at: string;
  solicitante: Pessoa | null;
  responsavel: Pessoa | null;
};

export type Evento = {
  id: string;
  tipo: "abertura" | "alteracao_status" | "alteracao_prioridade" | "alteracao_responsavel" | "observacao";
  created_at: string;
  autor: Pessoa | null;
  observacao: string | null;
  status_anterior: Status | null;
  status_novo: Status | null;
  prioridade_anterior: Prioridade | null;
  prioridade_nova: Prioridade | null;
  responsavel_novo: Pessoa | null;
};

// Busca o usuário logado. Devolve null se não houver sessão ou se for Cliente.
export async function buscarUsuarioDaEquipe() {
  const supabase = await createServerSupabaseClient();
  const resultado = await createAuth(supabase).context();
  if (!resultado.ok) return null;
  if (resultado.profile.papel === "cliente") return null;
  return { supabase, perfil: resultado.profile };
}

// Usado pelas páginas: se não for da equipe, manda para o login.
export async function exigirUsuarioDaEquipe() {
  const usuario = await buscarUsuarioDaEquipe();
  if (!usuario) redirect("/painel/entrar");
  return usuario;
}

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

// "responsavel:profiles!..." é um JOIN do Supabase: traz o nome da pessoa junto com a solicitação.
const COLUNAS = `id, numero, titulo, descricao, local, status, prioridade, responsavel_id, created_at,
  solicitante:profiles!solicitacoes_solicitante_id_fkey(id, nome),
  responsavel:profiles!solicitacoes_responsavel_id_fkey(id, nome)`;

// MVP-05: lista com filtro opcional por status e paginação.
export async function listarSolicitacoes(supabase: Supabase, status: string | null, pagina: number) {
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA - 1;

  let consulta = supabase.from("solicitacoes").select(COLUNAS, { count: "exact" });
  if (status) consulta = consulta.eq("status", status);

  const { data, count, error } = await consulta.order("created_at", { ascending: false }).range(inicio, fim);
  if (error) throw new Error("Erro ao listar solicitações");
  return { solicitacoes: data as unknown as Solicitacao[], total: count ?? 0 };
}

export async function buscarSolicitacao(supabase: Supabase, id: string) {
  const { data, error } = await supabase.from("solicitacoes").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw new Error("Erro ao buscar solicitação");
  return data as unknown as Solicitacao | null; // null = não existe ou não tem acesso
}

// MVP-10: histórico em ordem cronológica, com os nomes do autor e do novo responsável.
export async function buscarHistorico(supabase: Supabase, solicitacaoId: string) {
  const { data, error } = await supabase
    .from("historico")
    .select(`id, tipo, created_at, observacao, status_anterior, status_novo, prioridade_anterior, prioridade_nova,
      autor:profiles!historico_autor_id_fkey(id, nome),
      responsavel_novo:profiles!historico_responsavel_novo_fkey(id, nome)`)
    .eq("solicitacao_id", solicitacaoId)
    .order("created_at");
  if (error) throw new Error("Erro ao buscar histórico");
  return data as unknown as Evento[];
}

// MVP-07: Manutentores ativos para o Gestor escolher o responsável.
export async function listarManutentores(supabase: Supabase) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome")
    .eq("papel", "manutentor")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error("Erro ao listar manutentores");
  return data as Pessoa[];
}
