"use client";

import { Briefcase, Loader2, User } from "lucide-react";
import { WorkspaceCreateJoin } from "@/components/workspace/workspace-create-join";
import { WorkspaceDangerZone } from "@/components/workspace/workspace-danger-zone";
import { WorkspaceInviteCard } from "@/components/workspace/workspace-invite-card";
import { WorkspaceList } from "@/components/workspace/workspace-list";
import { WorkspaceMembersCard } from "@/components/workspace/workspace-members-card";
import { WorkspaceSettingsCard } from "@/components/workspace/workspace-settings-card";
import { useWorkspaceManagement } from "@/hooks/use-workspace-management";

export default function WorkspacePage() {
  const workspace = useWorkspaceManagement();
  const isOwner = workspace.activeData?.ownerId === workspace.currentUser?.uid;
  const isPersonal = workspace.activeData?.type === "personal";

  if (workspace.initialLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-in space-y-6 pb-24 duration-500 fade-in">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-white/10 bg-[#121722] p-4 shadow-xl shadow-black/10 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Meus Espaços
          </h1>
          <p className="mt-2 text-slate-400">
            Gerencie seus grupos financeiros e membros.
          </p>
        </div>

        {workspace.activeData && (
          <div className="flex w-full items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 backdrop-blur-sm md:w-auto">
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              Em uso:
            </div>
            <div className="flex items-center gap-2 font-bold text-white">
              {isPersonal ? <User size={18} /> : <Briefcase size={18} />}
              {workspace.activeData.name}
            </div>
          </div>
        )}
      </div>

      <WorkspaceList
        activeWorkspace={workspace.activeData}
        loading={workspace.loading}
        workspaces={workspace.myWorkspaces}
        onActivate={workspace.handleSwitch}
        onMakePersonal={(workspaceId) =>
          workspace.handleSetPrimary(workspaceId, true)
        }
      />

      <WorkspaceCreateJoin
        inviteCode={workspace.inviteCode}
        loading={workspace.loading}
        newWorkspaceName={workspace.newWorkspaceName}
        onCreate={workspace.handleCreate}
        onInviteCodeChange={workspace.setInviteCode}
        onJoin={workspace.handleJoin}
        onNewWorkspaceNameChange={workspace.setNewWorkspaceName}
      />

      {workspace.activeData && (
        <div className="space-y-5 border-t border-white/5 pt-6">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-lg p-3 ${
                isPersonal
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-purple-500/10 text-purple-400"
              }`}
            >
              {isPersonal ? <User size={32} /> : <Briefcase size={32} />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {workspace.activeData.name}
              </h2>
              <p className="text-slate-400">Configurações do espaço atual.</p>
            </div>
          </div>

          {isOwner && (
            <WorkspaceSettingsCard
              budget={workspace.editBudget}
              name={workspace.editName}
              saving={workspace.savingSettings}
              onBudgetChange={workspace.setEditBudget}
              onNameChange={workspace.setEditName}
              onSave={workspace.handleSaveSettings}
            />
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <WorkspaceInviteCard
              copied={workspace.copied}
              inviteCode={workspace.activeData.inviteCode}
              isPersonal={isPersonal}
              onCopy={workspace.handleCopy}
            />

            <WorkspaceMembersCard
              currentUserId={workspace.currentUser?.uid}
              isOwner={Boolean(isOwner)}
              members={workspace.activeData.members}
              onTogglePermission={workspace.togglePermission}
            />
          </div>

          <WorkspaceDangerZone
            isOwner={Boolean(isOwner)}
            loading={workspace.loading}
            onDelete={workspace.handleDelete}
            onLeave={workspace.handleLeave}
          />
        </div>
      )}
    </div>
  );
}
