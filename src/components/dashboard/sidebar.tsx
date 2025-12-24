"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  PlusCircle,
  ChevronDown,
  Check,
  X,
  Building2,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth-actions";
import { switchActiveWorkspace } from "@/actions/workspace-actions";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [displayWorkspace, setDisplayWorkspace] = useState(activeWorkspace);

  useEffect(() => {
    if (activeWorkspace && !isSwitching) {
      setDisplayWorkspace(activeWorkspace);
    }
  }, [activeWorkspace, isSwitching]);

  const menuItems = [
    { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
    { href: "/dashboard/transactions", label: "Lançamentos", icon: Wallet },
    { href: "/dashboard/payments", label: "Contas & Pix", icon: CreditCard },
    { href: "/dashboard/reports", label: "Relatórios", icon: Settings },
  ];

  const handleSwitchWorkspace = async (ws: any) => {
    if (ws.id === activeWorkspace?.id) {
      setDropdownOpen(false);
      return;
    }

    setIsSwitching(true);
    setDisplayWorkspace(ws);
    setDropdownOpen(false);

    try {
      await switchActiveWorkspace(ws.id);

      setActiveWorkspace(ws);

      router.refresh();

      router.push("/dashboard");
    } catch (error) {
    } finally {
      setTimeout(() => setIsSwitching(false), 500);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    setIsCreating(true);
    try {
      const docRef = await addDoc(collection(db, "workspaces"), {
        name: newGroupName,
        ownerId: user.uid,
        currency: "BRL",
        createdAt: serverTimestamp(),
        members: [user.uid],
      });

      const newWs = {
        id: docRef.id,
        name: newGroupName,
        ownerId: user.uid,
        currency: "BRL",
        type: "shared",
      };

      await switchActiveWorkspace(docRef.id);
      setActiveWorkspace(newWs);
      setDisplayWorkspace(newWs);
      router.refresh();

      setNewGroupName("");
      setShowCreateModal(false);
      setDropdownOpen(false);
    } catch (error) {
      alert("Erro ao criar grupo");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0F1218]/95 backdrop-blur-xl flex flex-col border-r border-white/5 transition-transform duration-300 md:translate-x-0">
        <div className="p-4 border-b border-white/5">
          <div className="relative w-full">
            <button
              onClick={() => setDropdownOpen(!isDropdownOpen)}
              disabled={isSwitching}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-indigo-900/20">
                  {isSwitching ? (
                    <Loader2 size={18} className="animate-spin text-white/80" />
                  ) : (
                    <Building2 size={20} className="text-white" />
                  )}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
                    {isSwitching ? "Trocando..." : "Workspace"}
                  </p>
                  <span className="font-bold text-sm truncate block text-white group-hover:text-indigo-200 transition-colors">
                    {displayWorkspace?.name || "Carregando..."}
                  </span>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-500 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
                <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                  <p className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Seus Grupos
                  </p>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between group transition-colors border-l-2 border-transparent",
                        ws.id === displayWorkspace?.id
                          ? "bg-indigo-500/10 text-white border-indigo-500"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="font-medium truncate">{ws.name}</span>
                      {ws.id === displayWorkspace?.id && (
                        <Check size={14} className="text-indigo-400" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/10 p-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition-all shadow-md shadow-indigo-900/20"
                  >
                    <PlusCircle size={14} /> Novo Grupo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
            Menu Principal
          </p>

          <NavItem
            href="/dashboard"
            icon={<LayoutDashboard size={18} />}
            label="Visão Geral"
            active={pathname === "/dashboard"}
          />
          <NavItem
            href="/dashboard/transactions"
            icon={<Wallet size={18} />}
            label="Transações"
            active={pathname.includes("/transactions")}
          />
          <NavItem
            href="/dashboard/payments"
            icon={<Wallet size={18} />}
            label="Contas & Pix"
            active={pathname.includes("/payments")}
          />
          <NavItem
            href="/dashboard/reports"
            icon={<Settings size={18} />}
            label="Relatórios"
            active={pathname.includes("/reports")}
          />

          <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 mt-6">
            Sistema
          </p>

          <NavItem
            href="/dashboard/workspace"
            icon={<Building2 size={18} />}
            label="Gerenciar Grupo"
            active={pathname.includes("/workspace")}
          />
          <NavItem
            href="/dashboard/settings"
            icon={<User size={18} />}
            label="Minha Conta"
            active={pathname.includes("/settings")}
          />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#13161C]">
              <h3 className="font-bold text-lg text-white">Criar Novo Grupo</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Nome do Grupo
                </label>
                <Input
                  placeholder="Ex: Casa, Viagem, Empresa..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="bg-[#0B0E14] border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 h-11 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white h-11"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-900/20"
                  disabled={isCreating || !newGroupName}
                >
                  {isCreating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Criar Grupo"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({ href, icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative mb-1",
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <span
        className={
          active
            ? "text-white"
            : "text-slate-500 group-hover:text-slate-300 transition-colors"
        }
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
