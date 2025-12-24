import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { PreferencesProvider } from "@/contexts/preferences-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Controle A Dois",
  description: "Gestão financeira compartilhada",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        <AuthProvider>
          <WorkspaceProvider>
            <PreferencesProvider>
               {children}
            </PreferencesProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}