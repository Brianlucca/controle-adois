import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Controle A Dois",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Controle A Dois",
  },
  description: "Gestão financeira compartilhada",
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
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
               <PwaRegister />
               {children}
            </PreferencesProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
