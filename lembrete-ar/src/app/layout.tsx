import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "Lembrete de retorno",
  description: "Seu cliente esquece de voltar. Faca ele voltar sozinho.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0a7ea4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
