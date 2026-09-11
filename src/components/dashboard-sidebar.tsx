"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Plus,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { logout } from "@/actions/auth-actions";
import { ControleADoisMark } from "@/components/controle-adois-logo";
import { useWorkspace } from "@/contexts/workspace-context";
import { cn } from "@/lib/utils";

const navigation = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/transactions", label: "Transações", icon: Wallet },
  { href: "/dashboard/payments", label: "Contas & Pix", icon: CreditCard },
  { href: "/dashboard/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/dashboard/reports", label: "Relatórios", icon: PieChart },
];
const accountNavigation = [
  { href: "/dashboard/workspace", label: "Espaços e pessoas", icon: Briefcase },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  async function selectWorkspace(id: string) {
    const workspace = workspaces.find((item) => item.id === id);
    if (!workspace || workspace.id === activeWorkspace?.id) {
      setSwitcherOpen(false);
      return;
    }
    await setActiveWorkspace(workspace);
    setSwitcherOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        aria-label="Abrir navegação"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3.5 z-50 grid h-9 w-9 place-items-center rounded-xl border border-[#e3e1e4] bg-white text-[#37383e] shadow-sm md:hidden"
      >
        <Menu size={19} />
      </button>
      {mobileOpen && (
        <button
          aria-label="Fechar navegação"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[70] flex flex-col border-r border-black/[.06] bg-[#fbfaf7] transition-[width,transform] duration-300 md:relative",
          collapsed ? "w-[76px]" : "w-[252px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-[72px] items-center justify-between px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center overflow-hidden",
              !collapsed && "gap-3",
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#635bff]">
              <ControleADoisMark className="h-6 w-6" />
            </span>
            <b
              className={cn(
                "whitespace-nowrap text-[15px] tracking-tight transition",
                collapsed && "w-0 opacity-0",
              )}
            >
              Controle A Dois
            </b>
          </Link>
          <button
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
            className="md:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="relative px-3">
          <button
            onClick={() => !collapsed && setSwitcherOpen(!switcherOpen)}
            className={cn(
              "flex w-full items-center rounded-2xl border border-[#e6e4e4] bg-white p-2.5 text-left transition hover:border-[#cfcbdc]",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f0efff] text-xs font-black text-[#635bff]">
              {activeWorkspace?.name?.slice(0, 2).toUpperCase() || "…"}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <small className="block text-[9px] font-bold uppercase tracking-wider text-[#9a9ca3]">
                    Espaço atual
                  </small>
                  <b className="block truncate text-xs">
                    {activeWorkspace?.name || "Carregando…"}
                  </b>
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-[#9a9ca3] transition",
                    switcherOpen && "rotate-180",
                  )}
                />
              </>
            )}
          </button>
          {switcherOpen && !collapsed && (
            <div className="absolute left-3 right-3 top-full z-20 mt-2 rounded-2xl border border-[#e5e3e5] bg-white p-1.5 shadow-[0_18px_50px_-20px_rgba(35,30,60,.3)]">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => selectWorkspace(workspace.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold hover:bg-[#f6f5f8]",
                    workspace.id === activeWorkspace?.id &&
                      "bg-[#f0efff] text-[#5d55dd]",
                  )}
                >
                  <span className="truncate">{workspace.name}</span>
                  {workspace.id === activeWorkspace?.id && <Check size={14} />}
                </button>
              ))}
              <div className="my-1 border-t border-[#efedf0]" />
              <Link
                href="/dashboard/workspace"
                onClick={() => setSwitcherOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#676a72] hover:bg-[#f6f5f8]"
              >
                <Plus size={14} /> Gerenciar espaços
              </Link>
            </div>
          )}
        </div>

        <nav className="mt-7 flex-1 space-y-1 overflow-y-auto px-3">
          <NavGroup
            label="Principal"
            collapsed={collapsed}
            items={navigation}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
          <NavGroup
            label="Conta"
            collapsed={collapsed}
            items={accountNavigation}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </nav>

        <div className="space-y-1 border-t border-black/[.06] p-3">
          <button
            onClick={() => logout()}
            className={cn(
              "flex h-11 w-full items-center rounded-xl px-3 text-sm font-semibold text-[#777a83] hover:bg-[#fff0ed] hover:text-[#c65549]",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <LogOut size={18} />
            {!collapsed && "Sair"}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden h-11 w-full items-center rounded-xl px-3 text-sm font-semibold text-[#90929a] hover:bg-white hover:text-[#45474e] md:flex",
              collapsed ? "justify-center" : "gap-3",
            )}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}{" "}
            {!collapsed && "Recolher menu"}
          </button>
        </div>
      </aside>
    </>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};
function NavGroup({
  label,
  collapsed,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  collapsed: boolean;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-7">
      <p
        className={cn(
          "mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-[#aaa9ae]",
          collapsed && "text-center text-[0px]",
        )}
      >
        {collapsed ? "•" : label}
      </p>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "mb-1 flex h-11 items-center rounded-xl px-3 text-sm font-semibold transition",
              collapsed ? "justify-center" : "gap-3",
              active
                ? "bg-[#eeecff] text-[#5e56dc]"
                : "text-[#70737b] hover:bg-white hover:text-[#282a30]",
            )}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}
