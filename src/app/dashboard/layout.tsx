"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { usePathname } from "next/navigation";

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
    <div className="flex h-screen w-full bg-[#0B0E14] text-slate-50 overflow-hidden font-sans">
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        <header className="h-20 flex items-center justify-between px-6 md:px-8 shrink-0 z-20 bg-[#0B0E14]/50 backdrop-blur-sm border-b border-white/5 pl-16 md:pl-8">
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

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </div>
      </main>
    </div>
  );
}