// Regras do painel administrativo.
// Este arquivo só decide O QUE MOSTRAR na tela. Quem realmente garante as regras é o banco
// (RLS + funções RPC do João): se alguém tentar burlar a tela, o banco recusa.

export type Papel = "cliente" | "gestor" | "manutentor";
export type Status = "pendente" | "aprovada" | "em_atendimento" | "concluida" | "descartada";
export type Prioridade = "baixa" | "media" | "alta";

export const LISTA_STATUS: Status[] = [
  "pendente",
  "aprovada",
  "em_atendimento",
  "concluida",
  "descartada"
];
export const LISTA_PRIORIDADES: Prioridade[] = ["baixa", "media", "alta"];

// Textos que aparecem na tela para cada valor do banco
export const NOME_STATUS = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  em_atendimento: "Em atendimento",
  concluida: "Concluída",
  descartada: "Descartada",
};
export const NOME_PRIORIDADE = { baixa: "Baixa", media: "Média", alta: "Alta" };
export const NOME_PAPEL = { cliente: "Cliente", gestor: "Gestor", manutentor: "Manutentor" };

export const ITENS_POR_PAGINA = 20;

type Usuario = { id: string; papel: Papel };
type Solicitacao = { status: Status; prioridade: Prioridade | null; responsavel_id: string | null };

// Diz quais botões/formulários aparecem para este usuário nesta solicitação.
export function acoesPermitidas(usuario: Usuario, solicitacao: Solicitacao) {
  const ehGestor = usuario.papel === "gestor";
  const ehResponsavel = usuario.papel === "manutentor" && solicitacao.responsavel_id === usuario.id;
  const status = solicitacao.status;
  const encerrada = status === "concluida" || status === "descartada";

  return {
    // MVP-06: só o Gestor, só enquanto está pendente
    aprovarOuDescartar: ehGestor && status === "pendente",
    // MVP-07: só o Gestor, depois de aprovada e antes de encerrar
    organizar: ehGestor && (status === "aprovada" || status === "em_atendimento"),
    // MVP-09: só o Manutentor responsável
    iniciar: ehResponsavel && status === "aprovada",
    concluir: ehResponsavel && status === "em_atendimento",
    // MVP-10: Gestor ou responsável, enquanto não estiver encerrada
    observar: !encerrada && (ehGestor || ehResponsavel),
  };
}

// Traduz os códigos de erro do banco (contrato MVP-02) para mensagens.
export function mensagemDeErro(codigo: string | undefined): string {
  if (codigo === "42501") return "Você não pode fazer essa ação agora. A página foi atualizada.";
  if (codigo === "23514")
    return "Dados inválidos. Lembre: para iniciar o atendimento a prioridade e o responsável precisam estar definidos.";
  if (!codigo) {
    return "Não foi possível confirmar a operação. Confira os dados e o histórico atualizados antes de enviar novamente.";
  }
  return "Não foi possível salvar. Verifique os dados e tente novamente.";
}

export function formatarData(data: string): string {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  });
}
