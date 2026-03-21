import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pokemon Deals Radar",
  description: "Agregador de ofertas de cartas y sobres Pokémon"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
