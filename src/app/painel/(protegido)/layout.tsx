// Layout de todas as páginas protegidas do painel.
// A pasta "(protegido)" entre parênteses não aparece na URL: é só para agrupar as páginas
// que usam este layout. A tela /painel/entrar fica fora dela.
import { exigirUsuarioDaEquipe } from "../../../lib/painel/dados";
import Navegacao from "../Navegacao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirUsuarioDaEquipe(); // sem login → vai para /painel/entrar

  return <Navegacao nome={perfil.nome} papel={perfil.papel}>{children}</Navegacao>;
}
