"use client";

import { useEffect, useState } from "react";
import {
  getUserWorkspaces,
  switchActiveWorkspace,
} from "@/actions/workspace-actions";
import { logout } from "@/actions/auth-actions";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Briefcase,
  LogOut,
  Menu,
  PieChart,
  Settings,
  ChevronsUpDown,
  Check,
  PlusCircle,
  Building2,
  Bell,
  User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWsId, setActiveWsId] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [userInitials, setUserInitials] = useState("US");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email || "");
        setUserName(user.displayName || "Usuário");
        if (user.displayName) {
          const names = user.displayName.trim().split(" ");
          setUserInitials((names[0][0] + (names[1]?.[0] || "")).toUpperCase());
        } else if (user.email) {
          setUserInitials(user.email.substring(0, 2).toUpperCase());
        }
        const list = await getUserWorkspaces(user.uid);
        setWorkspaces(list);
        if (list.length > 0) setActiveWsId((prev) => prev || list[0].id);
      }
    });
    return () => unsub();
  }, []);

  const handleSwitch = async (wsId: string) => {
    if (wsId === "new") {
      router.push("/dashboard/workspace");
      return;
    }
    setActiveWsId(wsId);
    setIsSwitcherOpen(false);
    await switchActiveWorkspace(wsId);
    window.location.reload();
  };

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Visão Geral";
    if (pathname.includes("/transactions")) return "Transações";
    if (pathname.includes("/payments")) return "Contas & Pix";
    if (pathname.includes("/reports")) return "Relatórios";
    if (pathname.includes("/workspace")) return "Workspace";
    if (pathname.includes("/settings")) return "Configurações";
    return "Dashboard";
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWsId);

  return (
    <div className="flex h-screen w-full bg-[#0B0E14] text-slate-50 overflow-hidden font-sans">
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <aside
        className={`
        bg-[#0F1218]/80 backdrop-blur-xl flex flex-col shrink-0 h-full w-72 border-r border-white/5
        fixed md:relative z-50 transition-transform duration-300
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mb-8">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Building2 size={18} />
            </div>
            Controle A Dois
          </div>

          <div className="relative">
            <button
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-8 w-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 border border-white/10">
                  {activeWorkspace
                    ? activeWorkspace.name.substring(0, 2).toUpperCase()
                    : "..."}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Espaço Atual
                  </p>
                  <p className="font-bold text-sm truncate text-white">
                    {activeWorkspace ? activeWorkspace.name : "Carregando..."}
                  </p>
                </div>
              </div>
              <ChevronsUpDown size={14} className="text-slate-500" />
            </button>

            {isSwitcherOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitch(ws.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        activeWsId === ws.id
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <span className="truncate font-medium">{ws.name}</span>
                      {activeWsId === ws.id && <Check size={14} />}
                    </button>
                  ))}
                  <div className="h-px bg-white/5 my-1"></div>
                  <button
                    onClick={() => handleSwitch("new")}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <PlusCircle size={14} /> Criar Novo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">
            Principal
          </p>
          <NavItem
            active={pathname === "/dashboard"}
            href="/dashboard"
            icon={<LayoutDashboard size={18} />}
            label="Visão Geral"
          />
          <NavItem
            active={pathname.includes("/transactions")}
            href="/dashboard/transactions"
            icon={<Wallet size={18} />}
            label="Transações"
          />
          <NavItem
            active={pathname.includes("/payments")}
            href="/dashboard/payments"
            icon={<Receipt size={18} />}
            label="Contas & Pix"
          />
          <NavItem
            active={pathname.includes("/reports")}
            href="/dashboard/reports"
            icon={<PieChart size={18} />}
            label="Relatórios"
          />

          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-6">
            Sistema
          </p>
          <NavItem
            active={pathname.includes("/workspace")}
            href="/dashboard/workspace"
            icon={<Briefcase size={18} />}
            label="Membros & Grupos"
          />
          <NavItem
            active={pathname.includes("/settings")}
            href="/dashboard/settings"
            icon={<Settings size={18} />}
            label="Configurações"
          />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 text-slate-400 hover:text-red-400 text-sm font-medium w-full p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        <header className="h-20 flex items-center justify-between px-6 md:px-8 shrink-0 z-20 bg-[#0B0E14]/50 backdrop-blur-sm border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden text-white hover:bg-white/10 p-2 rounded-lg"
            >
              <Menu size={24} />
            </button>
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

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
