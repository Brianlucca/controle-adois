"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { usePathname } from "next/navigation";
import { GlobalFinancialAssistant } from "@/components/assistant/global-financial-assistant";
import { FinanceProvider } from "@/hooks/use-finance";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userInitials, setUserInitials] = useState("US");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || "");
        setUserName(user.displayName || "Usuário");
        if (user.displayName) {
          const names = user.displayName.trim().split(" ");
          setUserInitials((names[0][0] + (names[1]?.[0] || "")).toUpperCase());
        } else if (user.email) {
          setUserInitials(user.email.substring(0, 2).toUpperCase());
        }
      }
    });
    return () => unsub();
  }, []);

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Visão Geral";
    if (pathname.includes("/transactions")) return "Transações";
    if (pathname.includes("/payments")) return "Contas & Pix";
    if (pathname.includes("/reports")) return "Relatórios";
    if (pathname.includes("/workspace")) return "Workspace";
    if (pathname.includes("/settings")) return "Configurações";
    return "Dashboard";
  };

  return (
    <FinanceProvider><div className="app-shell flex h-screen w-full text-slate-50 overflow-hidden font-sans">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#090c13]/70 px-4 pl-16 backdrop-blur-xl md:h-20 md:px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white leading-none">
                  {userName}
                </p>
                <p className="text-xs text-slate-400 mt-1">{userEmail}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-600/20">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </div>
      </main>
      <GlobalFinancialAssistant />
    </div></FinanceProvider>
  );
}
