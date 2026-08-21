"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  PieChart,
  Briefcase,
  Settings,
  LogOut,
  ChevronDown,
  Check,
  PlusCircle,
  Building2,
  X,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth-actions";
import { useWorkspace } from "@/contexts/workspace-context";

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
  const workspaceContext = useWorkspace();

  useEffect(() => {
    const list = workspaceContext?.workspaces || [];
    setWorkspaces(list);
    const current = workspaceContext?.activeWorkspace || list[0];
    if (current) {
      setActiveWsId(current.id);
      setActiveWsName(current.name);
    }
  }, [workspaceContext?.workspaces, workspaceContext?.activeWorkspace]);

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

    const targetWs = workspaces.find((w) => w.id === wsId);
    if (targetWs) {
      setActiveWsId(targetWs.id);
      setActiveWsName(targetWs.name);
      localStorage.setItem("lastActiveWorkspaceId", targetWs.id);
    }

    setIsSwitcherOpen(false);
    if (targetWs && workspaceContext?.setActiveWorkspace) {
      await workspaceContext.setActiveWorkspace({
        id: targetWs.id,
        name: targetWs.name,
        ownerId: targetWs.ownerId || "",
        currency: "BRL",
      });
    }
    router.refresh();
    window.location.href = pathname;
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-white/10 bg-[#121722] p-2.5 text-white shadow-xl shadow-black/20 transition-transform active:scale-95 md:hidden"
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
          "fixed inset-y-0 left-0 z-[70] flex flex-col border-r border-white/10 bg-[#0B0E14]/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-300 ease-in-out md:relative",
          isCollapsed ? "w-[80px]" : "w-72",
          isMobileOpen
            ? "translate-x-0 w-72"
            : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col py-4">
          <div
            className={cn(
              "mb-5 flex items-center px-3 transition-all duration-300",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="shrink-0 rounded-lg border border-indigo-500/30 bg-indigo-600 p-2 shadow-lg shadow-indigo-500/20">
                <Building2 size={20} className="text-white" />
              </div>

              <span
                className={cn(
                  "font-bold text-lg text-white tracking-tight whitespace-nowrap transition-all duration-300 origin-left",
                  isCollapsed
                    ? "w-0 opacity-0 scale-0"
                    : "w-auto opacity-100 scale-100"
                )}
              >
                Controle A Dois
              </span>
            </div>
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="relative mb-5 px-3">
            <button
              onClick={() => !isCollapsed && setIsSwitcherOpen(!isSwitcherOpen)}
              disabled={isSwitching}
              className={cn(
                "group flex w-full items-center rounded-lg border border-white/10 bg-[#121722] transition-all hover:border-indigo-500/30 hover:bg-white/[0.06] disabled:opacity-50",
                isCollapsed ? "justify-center p-2" : "justify-between p-3"
              )}
            >
              <div
                className={cn(
                  "flex items-center overflow-hidden",
                  !isCollapsed && "gap-3"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0E14] text-xs font-bold text-white shadow-sm">
                  {isSwitching ? (
                    <Loader2 className="animate-spin h-3 w-3" />
                  ) : activeWsName ? (
                    activeWsName.substring(0, 2).toUpperCase()
                  ) : (
                    "..."
                  )}
                </div>

                <div
                  className={cn(
                    "text-left overflow-hidden transition-all duration-300",
                    isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                  )}
                >
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">
                    Workspace
                  </p>
                  <p className="max-w-[130px] truncate text-sm font-bold text-white">
                    {activeWsName || "Carregando..."}
                  </p>
                </div>
              </div>

              {!isCollapsed && (
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-500 transition-transform duration-200",
                    isSwitcherOpen && "rotate-180"
                  )}
                />
              )}
            </button>

            {isSwitcherOpen && !isCollapsed && (
              <div className="absolute left-3 right-3 top-full z-50 mt-2 origin-top overflow-hidden rounded-lg border border-white/10 bg-[#121722] shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95">
                <div className="custom-scrollbar max-h-60 overflow-y-auto p-1.5">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitch(ws.id)}
                      className={cn(
                        "mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        activeWsId === ws.id
                          ? "border border-indigo-500/30 bg-indigo-500/15 text-white"
                          : "text-slate-300 hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="truncate font-medium">{ws.name}</span>
                      {activeWsId === ws.id && <Check size={14} />}
                    </button>
                  ))}
                  <div className="mx-2 my-1.5 h-px bg-white/10"></div>
                  <button
                    onClick={() => handleSwitch("new")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <PlusCircle size={14} /> Gerenciar / Criar
                  </button>
                </div>
              </div>
            )}
          </div>

          <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3">
            <SectionLabel collapsed={isCollapsed} label="Principal" />
            <NavItem
              collapsed={isCollapsed}
              active={pathname === "/dashboard"}
              href="/dashboard"
              icon={<LayoutDashboard size={20} />}
              label="Visão Geral"
            />
            <NavItem
              collapsed={isCollapsed}
              active={pathname.includes("/transactions")}
              href="/dashboard/transactions"
              icon={<Wallet size={20} />}
              label="Transações"
            />
            <NavItem
              collapsed={isCollapsed}
              active={pathname.includes("/payments")}
              href="/dashboard/payments"
              icon={<CreditCard size={20} />}
              label="Contas & Pix"
            />
            <NavItem
              collapsed={isCollapsed}
              active={pathname.includes("/calendar")}
              href="/dashboard/calendar"
              icon={<Calendar size={20} />}
              label="Calendário"
            />
            <NavItem
              collapsed={isCollapsed}
              active={pathname.includes("/reports")}
              href="/dashboard/reports"
              icon={<PieChart size={20} />}
              label="Relatórios"
            />

            <div className="mt-6">
              <SectionLabel collapsed={isCollapsed} label="Sistema" />
              <NavItem
                collapsed={isCollapsed}
                active={pathname.includes("/workspace")}
                href="/dashboard/workspace"
                icon={<Briefcase size={20} />}
                label="Membros & Grupos"
              />
              <NavItem
                collapsed={isCollapsed}
                active={pathname.includes("/settings")}
                href="/dashboard/settings"
                icon={<Settings size={20} />}
                label="Configurações"
              />
            </div>
          </nav>

          <div className="mt-auto space-y-1 border-t border-white/10 px-3 pt-4">
            <button
              onClick={() => logout()}
              className={cn(
                "group flex w-full items-center rounded-lg border border-transparent p-2.5 text-sm font-medium text-slate-400 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300",
                isCollapsed ? "justify-center" : "gap-3"
              )}
              title="Sair"
            >
              <LogOut
                size={20}
                className="group-hover:scale-110 transition-transform shrink-0"
              />

              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Encerrar Sessão
              </span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "mt-1 hidden w-full items-center rounded-lg border border-transparent p-2.5 text-slate-500 transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white md:flex",
                isCollapsed ? "justify-center" : "gap-3"
              )}
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}

              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Recolher Menu
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({
  collapsed,
  label,
}: {
  collapsed: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 mt-3 px-2 transition-all duration-300",
        collapsed ? "flex justify-center" : ""
      )}
    >
      {collapsed ? (
        <div className="my-2 h-0.5 w-4 rounded-full bg-white/10"></div>
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
        "group relative flex h-11 items-center rounded-lg border p-2.5 transition-all duration-200",
        active
          ? "border-indigo-500/40 bg-indigo-500/15 text-white shadow-lg shadow-indigo-950/20"
          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-slate-200",
        collapsed ? "justify-center" : "gap-3"
      )}
      title={collapsed ? label : ""}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
        )}
      >
        {icon}
      </span>

      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
          collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
        )}
      >
        {label}
      </span>

      {active && !collapsed && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-sm"></div>
      )}
    </Link>
  );
}
