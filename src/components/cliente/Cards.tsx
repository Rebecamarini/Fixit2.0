
import styles from "./Cards.module.css";

type CardsStruct = {
  titulo: string;
  valor: number;
  icone: string;
};

export default function Cards({
  titulo,
  valor,
  icone,
}: CardsStruct) {
  return (
    <div className={styles.card}>
      <div className={styles.icone}>{icone}</div>

      <span className={styles.titulo}>{titulo}</span>

      <strong className={styles.valor}>{valor}</strong>
    </div>
  );
}
