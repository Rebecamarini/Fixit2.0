"use server";
import { revalidatePath } from "next/cache";
import { exigirCliente } from "../../../lib/cliente/dados";
import { validarNovaSolicitacao } from "../../../lib/cliente/consultas";

export type Resultado = { mensagem: string; id?: string; incerto?: boolean } | null;

export async function enviar(_estado: Resultado, form: FormData): Promise<Resultado> {
  const { client } = await exigirCliente();
  const dados = validarNovaSolicitacao(form);
  if (!dados)
    return {
      mensagem: "Preencha título (até 150 caracteres), descrição (até 5000) e local (até 200)."
    };
  let resultado;
  try {
    resultado = await client.rpc("abrir_solicitacao", {
      p_titulo: dados.titulo,
      p_descricao: dados.descricao,
      p_local: dados.local
    });
  } catch {
    return {
      mensagem:
        "Não foi possível confirmar o envio. Confira suas solicitações antes de tentar novamente.",
      incerto: true
    };
  }
  if (resultado.error || !resultado.data) {
    const code = resultado.error?.code;
    const incerto = !code || !/^[0-9A-Z]{5}$/.test(code) || code.startsWith("08");
    return {
      mensagem: incerto
        ? "Não foi possível confirmar o envio. Confira suas solicitações antes de tentar novamente."
        : code === "42501"
          ? "Sua conta não pode abrir solicitações. Entre novamente."
          : "Não foi possível enviar. Confira os dados e tente novamente.",
      incerto
    };
  }
  revalidatePath("/");
  revalidatePath("/solicitacoes");
  revalidatePath("/painel/solicitacoes");
  return { mensagem: "Solicitação enviada com sucesso.", id: resultado.data.id };
}
