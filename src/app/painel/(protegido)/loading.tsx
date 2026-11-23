import estilos from "../painel.module.css";

export default function Carregando() {
  return <section className={`${estilos.cartao} ${estilos.estado}`}>
    <p role="status">Carregando solicitações…</p>
  </section>;
}
