import Carregando from "./(protegido)/loading";
import estilos from "../conta/form.module.css";

export default function CarregandoPainel() {
  return <main className={estilos.loginPage}><Carregando /></main>;
}
