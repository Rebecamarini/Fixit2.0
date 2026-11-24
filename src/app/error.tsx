"use client";
export default function Erro({ reset }: { reset: () => void }) {
  return <main>
    <h1>Não foi possível carregar esta página</h1>
    <p>Tente novamente em instantes.</p>
    <button onClick={reset}>Tentar novamente</button>
  </main>;
}
