"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, User, Lock, Trash2, 
  ShieldAlert, Moon, Bell, EyeOff, Eye
} from "lucide-react";
import { auth } from "@/lib/firebase-client";
import { updateProfile, sendPasswordResetEmail, deleteUser } from "firebase/auth";
import { logout } from "@/actions/auth-actions";
import { deleteFullAccountData } from "@/actions/user-actions";
import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";

const Switch = ({ checked, onCheckedChange, disabled = false }: { checked: boolean; onCheckedChange: (v: boolean) => void, disabled?: boolean }) => (
  <div 
    className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
    onClick={() => !disabled && onCheckedChange(!checked)}
  >
    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
);

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { hideValues, toggleHideValues, notifications, notificationPermission, toggleNotifications } = usePreferences();
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) setDisplayName(user.displayName || "");
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setLoadingProfile(true);
    try {
        await updateProfile(auth.currentUser, { displayName });
        alert("Perfil atualizado!");
    } catch (e) { alert("Erro ao atualizar."); }
    setLoadingProfile(false);
  };

  const handleResetPassword = async () => {
    if (user?.email) {
      await sendPasswordResetEmail(auth, user.email);
      alert("Email de redefinição enviado!");
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("ATENÇÃO: Você tem certeza absoluta? Isso apagará tudo.");
    if (!confirm || !auth.currentUser) return;

    setDeletingAccount(true);
    try {
        const result = await deleteFullAccountData(auth.currentUser.uid);
        if (!result.success) throw new Error(result.error);
        await deleteUser(auth.currentUser);
        await logout();
    } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
            alert("Faça login novamente para realizar essa ação.");
            await logout();
        } else {
            alert("Erro: " + error.message);
        }
    } finally {
        setDeletingAccount(false);
    }
  };

  if (authLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-white"/></div>;

  return (
    <div className="max-w-3xl space-y-5 pb-24 animate-in fade-in duration-500">
        
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#121722] p-4 shadow-xl shadow-black/10 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <div className="hidden h-6 w-px bg-white/10 sm:block"></div>
          <p className="text-slate-400 text-sm">Gerencie sua conta e preferências.</p>
        </div>

        <Card className="border-white/10 bg-[#121722]">
            <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-white"><User className="text-indigo-400" size={20}/> Meus Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome de Exibição</label>
                        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-slate-950 border-white/10 text-white h-11"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email de Acesso</label>
                        <Input value={user?.email || ""} disabled className="bg-slate-950/50 border-white/5 text-slate-500 cursor-not-allowed h-11"/>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleUpdateProfile} disabled={loadingProfile} className="h-11 w-full rounded-lg bg-indigo-600 px-6 font-bold text-white hover:bg-indigo-700 sm:w-auto">
                        {loadingProfile && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Salvar Alterações
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#121722]">
            <CardHeader><CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">Preferências do App</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-white/5">
                
                <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex gap-4 items-center">
                        <div className="rounded-lg bg-slate-800 p-2.5 text-indigo-400"><Moon size={20}/></div>
                        <div>
                            <p className="font-bold text-white">Modo Private (Escuro)</p>
                            <p className="text-xs text-slate-500">Tema exclusivo ativado por padrão.</p>
                        </div>
                    </div>
                    <Switch checked={true} onCheckedChange={() => {}} disabled={true} />
                </div>
                
                <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex gap-4 items-center">
                        <div className="rounded-lg bg-slate-800 p-2.5 text-emerald-400">{hideValues ? <EyeOff size={20}/> : <Eye size={20}/>}</div>
                        <div>
                            <p className="font-bold text-white">Ocultar Valores</p>
                            <p className="text-xs text-slate-500">Esconde saldos na tela inicial.</p>
                        </div>
                    </div>
                    <Switch checked={hideValues} onCheckedChange={toggleHideValues} />
                </div>

                <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex gap-4 items-center">
                        <div className="rounded-lg bg-slate-800 p-2.5 text-amber-400"><Bell size={20}/></div>
                        <div>
                            <p className="font-bold text-white">Notificações</p>
                            <p className="text-xs text-slate-500">
                              {notificationPermission === "denied"
                                ? "Bloqueadas pelo navegador. Libere nas permissões do site."
                                : notificationPermission === "unsupported"
                                  ? "Este navegador não oferece notificações."
                                  : "Alertas de contas vencidas, próximas do vencimento e projeção negativa."}
                            </p>
                        </div>
                    </div>
                    <Switch checked={notifications} onCheckedChange={toggleNotifications} disabled={notificationPermission === "unsupported"} />
                </div>
            </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#121722]">
            <CardHeader><CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex gap-2">Segurança</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-white/10 bg-[#0B0E14] p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg text-slate-400"><Lock size={18}/></div>
                        <div>
                            <p className="text-sm font-bold text-white">Senha de Acesso</p>
                            <p className="text-xs text-slate-500">Recomendamos alterar periodicamente.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleResetPassword} className="h-10 w-full text-indigo-400 hover:bg-white/10 hover:text-indigo-300 sm:w-auto">Redefinir Senha</Button>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5 p-4 md:flex-row md:items-center">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="text-red-500 mt-1" size={24}/>
                        <div>
                            <h4 className="font-bold text-white">Excluir Conta</h4>
                            <p className="text-sm text-slate-400 max-w-sm">Esta ação apagará todos os seus dados, workspaces e histórico financeiro permanentemente.</p>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deletingAccount} className="h-11 w-full rounded-lg bg-red-600 font-bold text-white hover:bg-red-700 md:w-auto">
                        {deletingAccount ? <Loader2 className="animate-spin mr-2"/> : <Trash2 size={16} className="mr-2"/>} Excluir Minha Conta
                    </Button>
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
