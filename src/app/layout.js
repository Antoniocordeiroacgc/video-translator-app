import "./globals.css";

export const metadata = {
  title: "VidTranslate AI — Tradução Automática de Vídeos",
  description:
    "Grave ou envie um vídeo em português e receba a versão legendada automaticamente em outro idioma, usando IA.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-neutral-950 text-neutral-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
