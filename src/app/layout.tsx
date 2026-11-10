import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixIt 2.0",
  description: "Gestão de solicitações de manutenção",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
