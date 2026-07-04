"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { 
  getWorkspaceDetails, joinWorkspace, createSharedWorkspace, getUserWorkspaces,     
  switchActiveWorkspace, leaveWorkspace, updateMemberPermissions, deleteWorkspace,
  updateWorkspaceName, updateWorkspaceSettings, setPrimaryWorkspace
} from "@/actions/workspace-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Copy, Loader2, LogOut, CheckCircle2, Plus, 
  Briefcase, User, ArrowRightLeft, Trash2, ShieldAlert, Lock, Save, Settings, Target
} from "lucide-react";

export default function WorkspacePage() {
  const [activeData, setActiveData] = useState<any>(null);
  const [myWorkspaces, setMyWorkspaces] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [inviteCode, setInviteCode] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
        if (user) loadData(user.uid);
        else setInitialLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeData) {
        setEditName(activeData.name || "");
        setEditBudget(activeData.budgetLimit ? activeData.budgetLimit.toString() : "0");
    }
  }, [activeData]);

  async function loadData(uid: string) {
    try {
        const details = await getWorkspaceDetails(uid);
        setActiveData(details);
        const list = await getUserWorkspaces(uid);
        setMyWorkspaces(list);
    } catch (error) { } finally { setInitialLoading(false); }
  }

  const handleCreate = async () => {
    if (!newWorkspaceName || !auth.currentUser) return;
    setLoading(true);
    const res = await createSharedWorkspace(auth.currentUser.uid, auth.currentUser.email!, newWorkspaceName);
    if (res.success) window.location.reload();
    else { alert(res.error); setLoading(false); }
  };

  const handleJoin = async () => {
    if (!auth.currentUser || !inviteCode) return;
    setLoading(true);
    const res = await joinWorkspace(auth.currentUser.uid, auth.currentUser.email!, inviteCode);
    if (res.success) window.location.reload();
    else { alert(res.error); setLoading(false); }
  };

  const handleSwitch = async (id: string) => {
    if (!auth.currentUser) return;
    setLoading(true);
    localStorage.setItem("lastActiveWorkspaceId", id);
    await switchActiveWorkspace(id, auth.currentUser.uid);
    window.location.reload();
  };

  const handleSetPrimary = async (id: string, makePersonal = false) => {
    if (!auth.currentUser) return;
    setLoading(true);
    localStorage.setItem("lastActiveWorkspaceId", id);
    const res = await setPrimaryWorkspace(auth.currentUser.uid, id, makePersonal);
    if (res.success) window.location.reload();
    else { alert(res.error); setLoading(false); }
  };

  const handleSaveSettings = async () => {
     if (!auth.currentUser || !activeData) return;
     setSavingSettings(true);
     try {
         if (editName !== activeData.name) await updateWorkspaceName(auth.currentUser.uid, editName);
         if (Number(editBudget) !== activeData.budgetLimit) await updateWorkspaceSettings(auth.currentUser.uid, { budgetLimit: Number(editBudget) });
         alert("Configurações salvas.");
         setActiveData((prev: any) => ({ ...prev, name: editName, budgetLimit: Number(editBudget) }));
     } catch (error) { alert("Erro ao salvar."); }
     setSavingSettings(false);
  };

  const handleLeave = async () => {
    if (!activeData || !auth.currentUser) return;
    if (!confirm("Tem certeza que deseja sair do grupo?")) return;
    setLoading(true);
    const res = await leaveWorkspace(auth.currentUser.uid, activeData.id);
    if (res.success) window.location.reload();
    else { alert(res.error); setLoading(false); }
  };

  const handleDelete = async () => {
    if (!activeData || !auth.currentUser) return;
    const confirmation = window.prompt(`DIGITE O NOME DO GRUPO PARA CONFIRMAR A EXCLUSÃO:\n\n${activeData.name}`);
    if (confirmation !== activeData.name) return;
    setLoading(true);
    const res = await deleteWorkspace(auth.currentUser.uid, activeData.id);
    if (res.success) { window.location.reload(); }
    else { alert(res.error); setLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeData.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const togglePermission = async (memberUid: string, field: string, currentValue: boolean) => {
    const currentUser = auth.currentUser;
    if (!currentUser || activeData.ownerId !== currentUser.uid) return;
    const newData = { ...activeData };
    const memberIndex = newData.members.findIndex((m: any) => (m.uid || m) === memberUid);
    if (memberIndex === -1) return;
    newData.members[memberIndex][field] = !currentValue;
    setActiveData(newData);
    await updateMemberPermissions(activeData.id, currentUser.uid, memberUid, { [field]: !currentValue });
  };

  const isOwner = activeData?.ownerId === auth.currentUser?.uid;
  const isPersonal = activeData?.type === 'personal';

  if (initialLoading) return <div className="h-[50vh] flex justify-center items-center"><Loader2 className="animate-spin text-indigo-500"/></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 animate-in fade-in duration-500">
      
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-white/10 bg-[#121722] p-4 shadow-xl shadow-black/10 md:flex-row md:items-center">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Meus Espaços</h1>
           <p className="text-slate-400 mt-2">Gerencie seus grupos financeiros e membros.</p>
        </div>
        
        {activeData && (
            <div className="flex w-full items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 backdrop-blur-sm md:w-auto">
                <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Em uso:</div>
                <div className="flex items-center gap-2 font-bold text-white">
                    {activeData.type === 'personal' ? <User size={18}/> : <Briefcase size={18}/>}
                    {activeData.name}
                </div>
            </div>
        )}
      </div>

      <section>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myWorkspaces.map(ws => {
                  const isActive = activeData && activeData.id === ws.id;
                  return (
                      <Card key={ws.id} className={`relative overflow-hidden bg-[#121722] transition-all ${isActive ? 'border-indigo-500/70 shadow-lg shadow-indigo-900/20' : 'border-white/10 hover:bg-[#20242D]'}`}>
                          <CardContent className="p-4 sm:p-5">
                              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${ws.type === 'personal' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                      {ws.type === 'personal' ? <User size={24}/> : <Briefcase size={24}/>}
                                  </div>
                                  <div className="min-w-0 pt-0.5">
                                      <h3 className="mb-1 flex min-w-0 items-center gap-2 text-lg font-bold leading-tight text-white">
                                        <span className="truncate">{ws.name}</span>
                                        {ws.type === 'personal' && <Lock size={14} className="text-slate-500" />}
                                      </h3>
                                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
                                          {ws.type === 'personal' ? 'Pessoal' : 'Compartilhado'}
                                      </p>
                                  </div>
                                  {isActive && (
                                      <div className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-[10px] font-bold text-white shadow-lg shadow-indigo-950/30">
                                          ATIVO
                                      </div>
                                  )}
                              </div>
                              {(!isActive || (ws.isOwner && ws.type !== 'personal')) && (
                              <div className="mt-5 space-y-2">
                                  {!isActive && (
                                      <Button variant="outline" size="sm" onClick={() => handleSwitch(ws.id)} disabled={loading} className="h-11 w-full border-white/10 bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white">
                                          {loading ? <Loader2 className="animate-spin"/> : <ArrowRightLeft size={16} className="mr-2"/>}
                                          Ativar agora
                                      </Button>
                                  )}
                                  {ws.isOwner && ws.type !== 'personal' && (
                                      <Button variant="outline" size="sm" onClick={() => handleSetPrimary(ws.id, true)} disabled={loading} className="h-11 w-full border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white">
                                          <User size={16} className="mr-2"/>
                                          Tornar meu espaço pessoal
                                      </Button>
                                  )}
                              </div>
                              )}
                          </CardContent>
                      </Card>
                  )
              })}
          </div>
      </section>

      <section className="border-t border-white/5 pt-2">
         <div className="grid gap-3 md:grid-cols-2">
             {/* Criar */}
             <div className="rounded-lg border border-dashed border-white/10 bg-[#121722] p-4 transition-colors hover:bg-[#1A1D24]">
                  <div className="flex items-center gap-2 mb-2 text-white font-bold"><Plus size={20} className="text-indigo-500"/> Criar Novo Grupo</div>
                  <p className="text-sm text-slate-400 mb-4">Crie um espaço para compartilhar finanças.</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                      <Input placeholder="Nome do grupo..." value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} className="bg-slate-950 border-white/10 text-white h-11"/>
                      <Button className="h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 sm:w-14" onClick={handleCreate} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Plus size={20}/>}</Button>
                  </div>
             </div>

             <div className="rounded-lg border border-dashed border-white/10 bg-[#121722] p-4 transition-colors hover:bg-[#1A1D24]">
                  <div className="flex items-center gap-2 mb-2 text-white font-bold"><Users size={20} className="text-emerald-500"/> Entrar com Código</div>
                  <p className="text-sm text-slate-400 mb-4">Insira o código de convite de 6 dígitos.</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                      <Input placeholder="XY99ZZ" className="uppercase tracking-widest font-mono bg-slate-950 border-white/10 text-white h-11" maxLength={6} value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}/>
                      <Button variant="outline" className="h-11 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white sm:w-24" onClick={handleJoin} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Entrar"}</Button>
                  </div>
             </div>
         </div>
      </section>

      {activeData && (
          <div className="space-y-5 border-t border-white/5 pt-6">
              <div className="flex items-center gap-4">
                 <div className={`rounded-lg p-3 ${isPersonal ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {isPersonal ? <User size={32}/> : <Briefcase size={32}/>}
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-white">{activeData.name}</h2>
                    <p className="text-slate-400">Configurações do espaço atual.</p>
                 </div>
              </div>

              {isOwner && (
                <Card className="bg-[#1A1D24] border-white/5">
                    <CardHeader><CardTitle className="text-base text-white flex items-center gap-2"><Settings size={18} className="text-indigo-400"/> Preferências</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome de Exibição</label>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-slate-950 border-white/10 text-white h-11"/>
                            </div>
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Target size={14}/> Meta de Gastos (R$)</label>
                                <Input type="number" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 font-mono"/>
                            </div>
                            <Button onClick={handleSaveSettings} disabled={savingSettings} className="h-11 w-full rounded-lg bg-indigo-600 px-6 hover:bg-indigo-700 md:w-auto">{savingSettings ? <Loader2 className="animate-spin"/> : <Save size={20}/>}</Button>
                        </div>
                    </CardContent>
                </Card>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                      <Card className="md:col-span-1 bg-[#1A1D24] border-white/5">
                          <CardHeader><CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">Código de Acesso</CardTitle></CardHeader>
                          <CardContent>
                              <div className="mb-4 rounded-lg border border-white/10 bg-[#0B0E14] p-5 text-center">
                                  <p className="text-3xl font-mono font-bold text-indigo-400 tracking-[0.2em]">{activeData.inviteCode || "----"}</p>
                              </div>
                              <Button variant="outline" className="h-12 w-full border-white/10 text-slate-200 hover:bg-white/10 hover:text-white" onClick={handleCopy} disabled={!activeData.inviteCode}>
                                  {copied ? <CheckCircle2 size={18} className="mr-2 text-emerald-400"/> : <Copy size={18} className="mr-2"/>} {copied ? "Copiado!" : "Copiar Código"}
                              </Button>
                              {isPersonal && (
                                <p className="mt-3 text-xs text-slate-500 text-center">
                                  Espaço pessoal também pode ser compartilhado.
                                </p>
                              )}
                          </CardContent>
                      </Card>

                      <Card className="md:col-span-2 bg-[#1A1D24] border-white/5">
                          <CardHeader><CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">Membros ({activeData.members.length})</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                              {activeData.members.map((m: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-4">
                                          <div className="h-10 w-10 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm border border-white/10">{(m.email || "?")[0].toUpperCase()}</div>
                                          <div>
                                              <p className="text-sm font-bold text-white">{m.email ? m.email.split('@')[0] : 'Usuário'}</p>
                                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${m.role === 'owner' ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-400 bg-white/10'}`}>{m.role === 'owner' ? 'Dono' : 'Membro'}</span>
                                          </div>
                                      </div>
                                      {isOwner && m.uid !== auth.currentUser?.uid ? (
                                         <button onClick={() => togglePermission(m.uid, 'canEdit', m.canEdit)} className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${m.canEdit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}>
                                            {m.canEdit ? "✓ Pode Editar" : "👁 Apenas Ver"}
                                         </button>
                                      ) : <span className="text-xs text-slate-500 font-medium px-3">{m.canEdit ? 'Editor' : 'Visualizador'}</span>}
                                  </div>
                              ))}
                          </CardContent>
                      </Card>
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5">
                  <div className="p-5 bg-red-500/10 border-b border-red-500/10 flex items-center gap-3 text-red-400">
                      <ShieldAlert size={20}/>
                      <h3 className="font-bold">Zona de Perigo</h3>
                  </div>
                  <div className="flex flex-col items-start justify-between gap-4 p-4 md:flex-row md:items-center">
                      <div>
                          <h4 className="font-bold text-white text-lg">{isOwner ? "Excluir Workspace" : "Sair do Grupo"}</h4>
                          <p className="text-sm text-slate-400 mt-1 max-w-md">{isOwner ? "Esta ação é irreversível. Todos os dados financeiros e históricos serão apagados permanentemente." : "Você perderá acesso imediato a todas as transações deste grupo."}</p>
                      </div>
                      <Button variant="destructive" onClick={isOwner ? handleDelete : handleLeave} disabled={loading} className="h-12 w-full rounded-lg bg-red-600 px-6 font-bold text-white hover:bg-red-700 md:w-auto">
                          {loading ? <Loader2 className="animate-spin"/> : <Trash2 size={18} className="mr-2"/>}
                          {isOwner ? "Excluir Definitivamente" : "Sair do Grupo"}
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
