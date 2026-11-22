import ClienteLayout from "../../../components/cliente/ClienteLayout";
import layout from "../../../components/cliente/ClienteLayout.module.css";
import { exigirCliente } from "../../../lib/cliente/dados";
import FormularioSolicitacao from "./form";

export default async function NovaSolicitacao() {
  const { perfil } = await exigirCliente();
  return <ClienteLayout nome={perfil.nome}><div className={layout.boasVindas}><div><h1>Nova solicitação</h1><p>Descreva o problema de manutenção e onde ele está.</p></div></div><FormularioSolicitacao /></ClienteLayout>;
}
