// Layout de todas as páginas protegidas do painel.
// A pasta "(protegido)" entre parênteses não aparece na URL: é só para agrupar as páginas
// que usam este layout. A tela /painel/entrar fica fora dela.
import Link from "next/link";
import { exigirUsuarioDaEquipe } from "../../../lib/painel/dados";
import { NOME_PAPEL } from "../../../lib/painel/regras";
import { FormSair } from "../formularios";
import estilos from "../painel.module.css";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirUsuarioDaEquipe(); // sem login → vai para /painel/entrar

  return (
    <>
      <header className={estilos.topo}>
        <Link href="/painel/solicitacoes">FixIt · Painel</Link>
        <span>
          {perfil.nome} ({NOME_PAPEL[perfil.papel]})
        </span>
        <FormSair />
      </header>
      <main className={estilos.conteudo}>{children}</main>
    </>
  );
}
