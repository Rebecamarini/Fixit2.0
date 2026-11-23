import { redirect } from "next/navigation";
import { exigirCliente } from "../lib/cliente/dados";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  await exigirCliente();
  redirect("/solicitacoes");
}
