"use client";

import ErroPainel from "./ErroPainel";
import estilos from "../conta/form.module.css";

export default function Erro({ retry }: { retry: () => void }) {
  return <main className={estilos.loginPage}>
    <ErroPainel retry={retry} />
  </main>;
}
