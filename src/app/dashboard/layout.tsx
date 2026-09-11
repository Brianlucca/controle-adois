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
    <FinanceProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden bg-[#f7f6f3] font-sans text-[#23242a]">
        <DashboardSidebar />

        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
          <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-black/[0.06] bg-[#fbfaf7]/90 px-4 pl-16 backdrop-blur-xl md:h-[72px] md:px-8">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-bold tracking-tight text-[#2b2c31]">
                {getPageTitle()}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold leading-none text-[#292a30]">
                    {userName}
                  </p>
                  <p className="mt-1 text-xs text-[#8a8d96]">{userEmail}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ebe9ff] text-xs font-bold text-[#5d55dd] ring-1 ring-[#dad6ff]">
                  {userInitials}
                </div>
              </div>
            </div>
          </header>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-[1280px]">{children}</div>
          </div>
        </main>
        <GlobalFinancialAssistant />
      </div>
    </FinanceProvider>
  );
}
