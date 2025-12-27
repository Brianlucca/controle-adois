"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Wallet, CreditCard, PieChart, Briefcase, Settings, 
  LogOut, ChevronDown, Check, PlusCircle, Building2, X, 
  Loader2, Menu, PanelLeftClose, PanelLeftOpen 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth-actions";
import { getUserWorkspaces, switchActiveWorkspace, getActiveWorkspaceId } from "@/actions/workspace-actions";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWsId, setActiveWsId] = useState("");
  const [activeWsName, setActiveWsName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const list = await getUserWorkspaces(user.uid);
        setWorkspaces(list);
        
        const storedActiveId = await getActiveWorkspaceId();

        if (list.length > 0) {
            const current = list.find(w => w.id === storedActiveId) || list[0];
            
            setActiveWsId(current.id);
            setActiveWsName(current.name);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleSwitch = async (wsId: string) => {
    if (wsId === "new") {
      router.push("/dashboard/workspace");
      return;
    }

    if (wsId === activeWsId) {
        setIsSwitcherOpen(false);
        return;
    }
    
    setIsSwitching(true);
    
    const targetWs = workspaces.find(w => w.id === wsId);
    if (targetWs) {
        setActiveWsId(targetWs.id);
        setActiveWsName(targetWs.name);
    }

    setIsSwitcherOpen(false);
    
    await switchActiveWorkspace(wsId);
    
    window.location.href = "/dashboard"; 
  };

  return (
    <>
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#1A1D24] text-white rounded-xl shadow-xl border border-white/10 active:scale-95 transition-transform"
      >
        <Menu size={20} />
      </button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
            "fixed inset-y-0 left-0 z-[70] bg-[#0F1218]/95 backdrop-blur-xl flex flex-col border-r border-white/5 transition-all duration-300 ease-in-out md:relative",
            isCollapsed ? "w-[80px]" : "w-72",
            isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full py-4">
            
            <div className={cn("flex items-center px-4 mb-6 transition-all duration-300", isCollapsed ? "justify-center" : "justify-between")}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-indigo-600 p-2 rounded-xl shrink-0 shadow-lg shadow-indigo-500/20">
                        <Building2 size={20} className="text-white" />
                    </div>
                    
                    <span className={cn(
                        "font-bold text-lg text-white tracking-tight whitespace-nowrap transition-all duration-300 origin-left",
                        isCollapsed ? "w-0 opacity-0 scale-0" : "w-auto opacity-100 scale-100"
                    )}>
                        Controle A Dois
                    </span>
                </div>
                {isMobileOpen && (
                    <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                )}
            </div>

            <div className="px-3 mb-6 relative">
                <button
                    onClick={() => !isCollapsed && setIsSwitcherOpen(!isSwitcherOpen)}
                    disabled={isSwitching}
                    className={cn(
                        "w-full flex items-center rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group disabled:opacity-50",
                        isCollapsed ? "justify-center p-2" : "justify-between p-2.5"
                    )}
                >
                    <div className={cn("flex items-center overflow-hidden", !isCollapsed && "gap-3")}>
                        <div className="h-8 w-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 border border-white/10 shadow-sm">
                            {isSwitching ? <Loader2 className="animate-spin h-3 w-3"/> : activeWsName ? activeWsName.substring(0, 2).toUpperCase() : "..."}
                        </div>
                        
                        <div className={cn("text-left overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">
                                Workspace
                            </p>
                            <p className="font-medium text-sm truncate text-white max-w-[120px]">
                                {activeWsName || "Carregando..."}
                            </p>
                        </div>
                    </div>
                    
                    {!isCollapsed && (
                        <ChevronDown size={14} className={cn("text-slate-500 transition-transform duration-200", isSwitcherOpen && "rotate-180")} />
                    )}
                </button>

                {isSwitcherOpen && !isCollapsed && (
                    <div className="absolute top-full left-3 right-3 mt-2 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top">
                        <div className="p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                            {workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={() => handleSwitch(ws.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors mb-0.5",
                                        activeWsId === ws.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" : "hover:bg-white/5 text-slate-300"
                                    )}
                                >
                                    <span className="truncate font-medium">{ws.name}</span>
                                    {activeWsId === ws.id && <Check size={14} />}
                                </button>
                            ))}
                            <div className="h-px bg-white/5 my-1.5 mx-2"></div>
                            <button
                                onClick={() => handleSwitch("new")}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <PlusCircle size={14} /> Gerenciar / Criar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden px-3">
                <SectionLabel collapsed={isCollapsed} label="Principal" />
                <NavItem collapsed={isCollapsed} active={pathname === "/dashboard"} href="/dashboard" icon={<LayoutDashboard size={20} />} label="Visão Geral" />
                <NavItem collapsed={isCollapsed} active={pathname.includes("/transactions")} href="/dashboard/transactions" icon={<Wallet size={20} />} label="Transações" />
                <NavItem collapsed={isCollapsed} active={pathname.includes("/payments")} href="/dashboard/payments" icon={<CreditCard size={20} />} label="Contas & Pix" />
                <NavItem collapsed={isCollapsed} active={pathname.includes("/reports")} href="/dashboard/reports" icon={<PieChart size={20} />} label="Relatórios" />

                <div className="mt-6">
                    <SectionLabel collapsed={isCollapsed} label="Sistema" />
                    <NavItem collapsed={isCollapsed} active={pathname.includes("/workspace")} href="/dashboard/workspace" icon={<Briefcase size={20} />} label="Membros & Grupos" />
                    <NavItem collapsed={isCollapsed} active={pathname.includes("/settings")} href="/dashboard/settings" icon={<Settings size={20} />} label="Configurações" />
                </div>
            </nav>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-1 px-3">
                <button
                    onClick={() => logout()}
                    className={cn(
                        "flex items-center text-slate-400 hover:text-red-400 text-sm font-medium w-full p-2.5 rounded-xl hover:bg-red-500/5 transition-all group",
                        isCollapsed ? "justify-center" : "gap-3"
                    )}
                    title="Sair"
                >
                    <LogOut size={20} className="group-hover:scale-110 transition-transform shrink-0"/>
                    
                    <span className={cn(
                        "whitespace-nowrap transition-all duration-300 overflow-hidden",
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}>
                        Encerrar Sessão
                    </span>
                </button>
                
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "hidden md:flex items-center text-slate-500 hover:text-white w-full p-2.5 rounded-xl hover:bg-white/5 transition-all mt-1",
                        isCollapsed ? "justify-center" : "gap-3"
                    )}
                    title={isCollapsed ? "Expandir" : "Recolher"}
                >
                    {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    
                    <span className={cn(
                        "text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}>
                        Recolher Menu
                    </span>
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ collapsed, label }: { collapsed: boolean, label: string }) {
    return (
        <div className={cn("px-3 mb-2 mt-2 transition-all duration-300", collapsed ? "flex justify-center" : "")}>
            {collapsed ? (
                <div className="h-0.5 w-4 bg-white/10 rounded-full my-2"></div>
            ) : (
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80 whitespace-nowrap">
                    {label}
                </p>
            )}
        </div>
    );
}

function NavItem({ href, icon, label, active, collapsed }: any) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center p-2.5 rounded-xl transition-all duration-200 group relative",
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
        collapsed ? "justify-center" : "gap-3"
      )}
      title={collapsed ? label : ""}
    >
      <span className={cn("shrink-0 transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-slate-300")}>
        {icon}
      </span>
      
      <span className={cn(
          "text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
          collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
      )}>
        {label}
      </span>

      {active && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50 shadow-sm animate-pulse"></div>
      )}
    </Link>
  );
}