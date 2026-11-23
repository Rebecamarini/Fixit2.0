"use client";

import estilos from "./painel.module.css";

export default function ErroPainel({ retry }: { retry: () => void }) {
  return <section className={`${estilos.cartao} ${estilos.estado}`} aria-labelledby="erro-painel">
    <h1 id="erro-painel">Não foi possível carregar esta página</h1>
    <p role="alert">Tente novamente em instantes.</p>
    <button className={estilos.botao} onClick={retry}>Tentar novamente</button>
  </section>;
}
