import type { SupabaseClient } from "@supabase/supabase-js";
import type { Solicitacao } from "../painel/dados.ts";

const COLUNAS = `id,numero,titulo,descricao,local,status,prioridade,responsavel_id,created_at,
  solicitante:profiles!solicitacoes_solicitante_id_fkey(id,nome),
  responsavel:profiles!solicitacoes_responsavel_id_fkey(id,nome)`;

// Filtro explícito de autoria além da RLS; nunca recebe identidade do formulário.
export async function consultarSolicitacoes(client: SupabaseClient, solicitante: string) {
  const itens: Solicitacao[] = [];
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await client.from("solicitacoes").select(COLUNAS)
      .eq("solicitante_id", solicitante).order("created_at", { ascending: false })
      .order("id", { ascending: false }).range(inicio, inicio + 499);
    if (error || !data) throw new Error("Não foi possível consultar suas solicitações.");
    itens.push(...data as unknown as Solicitacao[]);
    if (data.length < 500) return itens;
  }
}

export async function consultarSolicitacao(client: SupabaseClient, solicitante: string, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await client.from("solicitacoes").select(COLUNAS)
    .eq("solicitante_id", solicitante).eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a solicitação.");
  return data as unknown as Solicitacao | null;
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function filtrarSolicitacoes(itens: Solicitacao[], busca: string, status: string) {
  const termo = normalizar(busca.trim());
  return itens.filter(item => (!status || item.status === status)
    && normalizar(`${item.numero} ${item.id} ${item.titulo} ${item.local}`).includes(termo));
}

export function validarNovaSolicitacao(form: FormData) {
  const valores = { titulo: form.get("titulo"), descricao: form.get("descricao"), local: form.get("local") };
  if (Object.values(valores).some(value => typeof value !== "string" || !value.trim())) return null;
  const dados = Object.fromEntries(Object.entries(valores).map(([key, value]) => [key, (value as string).trim()])) as Record<keyof typeof valores, string>;
  if ([...dados.titulo].length > 150 || [...dados.descricao].length > 5000 || [...dados.local].length > 200) return null;
  return dados;
}
