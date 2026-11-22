import Link from "next/link";
export default function Ausente() {
  return <main><h1>Solicitação não encontrada</h1><p>Ela não existe ou não está disponível para sua conta.</p><Link href="/solicitacoes">Voltar às solicitações</Link></main>;
}
