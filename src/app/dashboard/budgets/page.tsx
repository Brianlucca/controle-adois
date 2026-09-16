"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  archiveFinancialBudget,
  getFinancialBudgets,
  saveFinancialBudget,
  unarchiveFinancialBudget,
} from "@/actions/budget-actions";
import { BudgetFormPanel } from "@/components/budgets/budget-form-panel";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/contexts/preferences-context";
import {
  useWorkspace,
  type WorkspaceParticipant,
} from "@/contexts/workspace-context";
import { useFinance } from "@/hooks/use-finance";
import type {
  BudgetHealth,
  BudgetUsage,
  FinancialBudget,
  FinancialBudgetInput,
} from "@/lib/finance/budget-types";
import type { FinancialCategory } from "@/lib/finance/category-types";
import {
  calculateBudgetOverview,
  calculateBudgetUsage,
} from "@/lib/finance/budgets";
import { getBahiaDateKey } from "@/lib/finance/date";
import { formatCurrency, formatDate } from "@/lib/utils";

const HEALTH_LABEL: Record<BudgetHealth, string> = {
  healthy: "Dentro do limite",
  attention: "Acompanhe de perto",
  critical: "Limite próximo",
  exceeded: "Limite ultrapassado",
};

const HEALTH_STYLE: Record<BudgetHealth, string> = {
  healthy: "bg-[#eaf8f3] text-[#177b63]",
  attention: "bg-[#fff7e8] text-[#94691f]",
  critical: "bg-[#fff0ed] text-[#c65a4d]",
  exceeded: "bg-[#ffe9e6] text-[#b9463c]",
};

const PROGRESS_STYLE: Record<BudgetHealth, string> = {
  healthy: "bg-[#635bff]",
  attention: "bg-[#e3a83d]",
  critical: "bg-[#df7667]",
  exceeded: "bg-[#ca5146]",
};

export default function BudgetsPage() {
  const {
    snapshotTransactions,
    cycleRange,
    ensureRangeLoaded,
    loading: loadingTransactions,
    user,
  } = useFinance();
  const { activeWorkspace } = useWorkspace();
  const { hideValues } = usePreferences();
  const [budgets, setBudgets] = useState<FinancialBudget[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string>();
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formWorkspaceId, setFormWorkspaceId] = useState<string>();
  const [editingBudget, setEditingBudget] = useState<FinancialBudget | null>(null);
  const requestSequence = useRef(0);

  const participants = useMemo<WorkspaceParticipant[]>(() => {
    if (activeWorkspace?.participants.length) return activeWorkspace.participants;
    if (!user) return [];
    return [
      {
        userId: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "Você",
        email: user.email || "",
        isCurrentUser: true,
      },
    ];
  }, [activeWorkspace?.participants, user]);

  const loadBudgets = useCallback(async () => {
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId) {
      setBudgets([]);
      setCategories([]);
      setCanEdit(false);
      setLoadedWorkspaceId(undefined);
      setLoadingBudgets(false);
      return;
    }
    const sequence = ++requestSequence.current;
    setLoadingBudgets(true);
    setError("");
    let result = await getFinancialBudgets(workspaceId);
    if (!result.success && result.error === "workspace_changed") {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      result = await getFinancialBudgets(workspaceId);
    }
    if (sequence !== requestSequence.current) return;
    if (result.success) {
      setBudgets(result.budgets);
      setCategories(result.categories);
      setCanEdit(result.canEdit);
    } else {
      setCanEdit(false);
      setError(
        result.error === "workspace_changed"
          ? "O espaço ativo mudou. Atualize a página para continuar."
          : result.error,
      );
    }
    setLoadedWorkspaceId(activeWorkspace?.id);
    setLoadingBudgets(false);
  }, [activeWorkspace?.id]);

  useEffect(() => {
    void ensureRangeLoaded(cycleRange);
  }, [cycleRange, ensureRangeLoaded]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBudgets(), 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
    };
  }, [loadBudgets]);

  const currentBudgets = useMemo(
    () =>
      activeWorkspace?.id && loadedWorkspaceId === activeWorkspace.id
        ? budgets
        : [],
    [activeWorkspace, budgets, loadedWorkspaceId],
  );
  const currentCategories = useMemo(
    () =>
      activeWorkspace?.id && loadedWorkspaceId === activeWorkspace.id
        ? categories
        : [],
    [activeWorkspace, categories, loadedWorkspaceId],
  );
  const activeBudgets = useMemo(
    () => currentBudgets.filter((budget) => !budget.archivedAt),
    [currentBudgets],
  );
  const archivedBudgets = useMemo(
    () => currentBudgets.filter((budget) => budget.archivedAt),
    [currentBudgets],
  );
  const usages = useMemo(
    () =>
      activeBudgets.map((budget) =>
        calculateBudgetUsage({
          budget,
          transactions: snapshotTransactions,
          cycleRange,
          todayKey: getBahiaDateKey(new Date()),
        }),
      ),
    [activeBudgets, cycleRange, snapshotTransactions],
  );
  const overview = useMemo(() => calculateBudgetOverview(usages), [usages]);
  const participantById = useMemo(
    () => new Map(participants.map((participant) => [participant.userId, participant])),
    [participants],
  );
  const displayCents = (valueCents: number) =>
    hideValues ? "••••••" : formatCurrency(valueCents / 100);
  const effectiveCanEdit =
    Boolean(activeWorkspace?.id) &&
    loadedWorkspaceId === activeWorkspace?.id &&
    canEdit;
  const loading =
    loadingBudgets ||
    loadedWorkspaceId !== activeWorkspace?.id ||
    loadingTransactions;

  function participantName(userId: string) {
    const participant = participantById.get(userId);
    if (!participant) return "Participante anterior";
    return participant.isCurrentUser
      ? `${participant.displayName} (você)`
      : participant.displayName;
  }

  async function handleSave(values: FinancialBudgetInput, id?: string) {
    if (!formWorkspaceId || formWorkspaceId !== activeWorkspace?.id) {
      return { success: false, error: "O espaço ativo mudou. Abra o formulário novamente." };
    }
    const result = await saveFinancialBudget(values, id, formWorkspaceId);
    if (result.success) {
      setFormOpen(false);
      setEditingBudget(null);
      await loadBudgets();
    }
    return result;
  }

  function openCreateForm() {
    setEditingBudget(null);
    setFormWorkspaceId(activeWorkspace?.id);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditForm(budget: FinancialBudget) {
    setEditingBudget(budget);
    setFormWorkspaceId(activeWorkspace?.id);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setFormOpen(false);
    setEditingBudget(null);
    setFormWorkspaceId(undefined);
  }

  async function handleArchive(budget: FinancialBudget) {
    if (!window.confirm(`Arquivar o limite de ${budget.category}?`)) return;
    const result = await archiveFinancialBudget(budget.id, activeWorkspace?.id);
    if (!result.success) {
      setError(
        ("error" in result && result.error) ||
          "Não foi possível arquivar o orçamento.",
      );
      return;
    }
    await loadBudgets();
  }

  async function handleUnarchive(budget: FinancialBudget) {
    const result = await unarchiveFinancialBudget(budget.id, activeWorkspace?.id);
    if (!result.success) {
      setError(
        ("error" in result && result.error) ||
          "Não foi possível desarquivar o orçamento.",
      );
      return;
    }
    await loadBudgets();
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">Planejamento do ciclo</p>
          <h1 className="app-title mt-1">Orçamento do casal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777a83]">
            Combine limites, acompanhe o ritmo de cada categoria e veja o que ainda
            cabe no ciclo sem alterar o saldo das contas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[#e1dfe4] bg-white px-4 py-2.5 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#9698a0]">
              Ciclo atual
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#34353b]">
              {formatDate(cycleRange.from)} — {formatDate(cycleRange.to)}
            </p>
          </div>
          <Button onClick={openCreateForm} disabled={!effectiveCanEdit} className="h-12">
            <Plus size={17} className="mr-2" /> Novo limite
          </Button>
        </div>
      </header>

      {formOpen &&
        formWorkspaceId === activeWorkspace?.id &&
        user &&
        effectiveCanEdit && (
        <BudgetFormPanel
          key={editingBudget?.id || "new-budget"}
          budget={editingBudget}
          categories={currentCategories}
          participants={participants}
          currentUserId={user.uid}
          onCancel={closeForm}
          onSubmit={handleSave}
        />
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-[#f0d3cf] bg-[#fff8f6] px-4 py-3 text-sm text-[#b84e45]">
          {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<CircleDollarSign size={18} />}
          label="Limites combinados"
          value={displayCents(overview.limitCents)}
        />
        <SummaryCard
          icon={<ReceiptText size={18} />}
          label="Já utilizado"
          value={displayCents(overview.spentCents)}
        />
        <SummaryCard
          icon={<WalletCards size={18} />}
          label="Ainda disponível"
          value={displayCents(overview.remainingCents)}
          negative={overview.remainingCents < 0}
        />
        <SummaryCard
          icon={<AlertTriangle size={18} />}
          label="Pedem atenção"
          value={String(overview.atRiskCount)}
          negative={overview.atRiskCount > 0}
        />
      </section>

      {loading ? (
        <div className="app-card grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-[#635bff]" />
        </div>
      ) : usages.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {usages.map((usage) => (
            <BudgetCard
              key={usage.budget.id}
              usage={usage}
              participantName={participantName}
              displayCents={displayCents}
              onEdit={effectiveCanEdit ? () => openEditForm(usage.budget) : undefined}
              onArchive={effectiveCanEdit ? () => handleArchive(usage.budget) : undefined}
            />
          ))}
        </section>
      ) : (
        <EmptyBudgets canEdit={effectiveCanEdit} onCreate={openCreateForm} />
      )}

      {archivedBudgets.length > 0 && (
        <details className="app-card overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-[#777a83]">
            Orçamentos arquivados ({archivedBudgets.length})
          </summary>
          <div className="grid gap-3 border-t border-[#efedf0] p-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedBudgets.map((budget) => (
              <article key={budget.id} className="rounded-xl border border-[#e4e2e5] bg-[#faf9fb] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold">{budget.category}</h3>
                    <p className="mt-1 text-xs text-[#8b8d95]">
                      {budget.scope === "shared"
                        ? "Limite do casal"
                        : participantName(budget.participantUserId || "")}
                    </p>
                  </div>
                  {effectiveCanEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnarchive(budget)}
                      className="shrink-0 text-xs text-[#5d55dd]"
                    >
                      <ArchiveRestore size={14} className="mr-2" /> Desarquivar
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  negative = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <article className="app-card p-5">
      <div className={negative ? "flex items-center gap-2 text-[#c65a4d]" : "flex items-center gap-2 text-[#635bff]"}>
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#858790]">{label}</p>
      </div>
      <p className={`mt-4 text-2xl font-black tracking-tight ${negative ? "text-[#bb4d43]" : "text-[#292a30]"}`}>
        {value}
      </p>
    </article>
  );
}

function BudgetCard({
  usage,
  participantName,
  displayCents,
  onEdit,
  onArchive,
}: {
  usage: BudgetUsage;
  participantName: (userId: string) => string;
  displayCents: (valueCents: number) => string;
  onEdit?: () => void;
  onArchive?: () => void;
}) {
  const { budget } = usage;
  const progressWidth = Math.min(100, Math.max(0, usage.usedPercentage));
  const remainingLabel =
    usage.remainingCents >= 0
      ? `${displayCents(usage.remainingCents)} disponíveis`
      : `${displayCents(Math.abs(usage.remainingCents))} acima do limite`;

  return (
    <article className="app-card overflow-hidden">
      <div className="flex items-start gap-3 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eeebff] text-[#635bff]">
          {budget.scope === "shared" ? <UsersRound size={20} /> : <Gauge size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold">{budget.category}</h2>
            <span className="rounded-md bg-[#f1efff] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#5d55dd]">
              {budget.scope === "shared"
                ? "Do casal"
                : participantName(budget.participantUserId || "")}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8b8d95]">
            Acompanhado por {participantName(budget.responsibleUserId)}
          </p>
        </div>
        {(onEdit || onArchive) && (
          <div className="flex shrink-0 items-center gap-1">
          {onEdit && <button
            type="button"
            aria-label={`Editar orçamento de ${budget.category}`}
            title="Editar limite"
            onClick={onEdit}
            className="rounded-lg p-2 text-[#777a83] transition hover:bg-[#f4f2f5] hover:text-[#5d55dd]"
          >
            <Pencil size={15} />
          </button>}
          {onArchive && <button
            type="button"
            aria-label={`Arquivar orçamento de ${budget.category}`}
            title="Arquivar orçamento"
            onClick={onArchive}
            className="rounded-lg p-2 text-[#9a9ca3] transition hover:bg-[#f4f2f5] hover:text-[#5b5d65]"
          >
            <Archive size={15} />
          </button>}
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9698a0]">Utilizado</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#292a30]">
              {displayCents(usage.spentCents)}
            </p>
          </div>
          <p className="text-right text-xs font-semibold text-[#73757e]">
            de {displayCents(budget.limitCents)}
          </p>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ecebef]">
          <div
            className={`h-full rounded-full transition-[width] ${PROGRESS_STYLE[usage.health]}`}
            style={{ width: `${progressWidth}%` }}
            role="progressbar"
            aria-label={`Uso do orçamento de ${budget.category}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(usage.usedPercentage))}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#858790]">
          <span>{Math.round(usage.usedPercentage)}% utilizado</span>
          <span>{remainingLabel}</span>
        </div>

        <div className={`mt-4 rounded-xl px-3.5 py-3 ${HEALTH_STYLE[usage.health]}`}>
          <div className="flex items-center gap-2 text-xs font-extrabold">
            {usage.health === "healthy" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {HEALTH_LABEL[usage.health]}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed opacity-80">
            {budgetMessage(usage, displayCents)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#eceaec] bg-[#faf9fb] p-3 text-xs">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#9698a0]">Pendentes</p>
            <p className="mt-1 font-extrabold text-[#44464d]">{displayCents(usage.pendingCents)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#9698a0]">Ciclo transcorrido</p>
            <p className="mt-1 font-extrabold text-[#44464d]">{Math.round(usage.cycleProgressPercentage)}%</p>
          </div>
        </div>

        {budget.scope === "shared" && usage.participantUsage.length > 0 && (
          <div className="mt-4 border-t border-[#efedf0] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9698a0]">Uso por pessoa</p>
            <div className="mt-2 space-y-2">
              {usage.participantUsage.map((participant) => (
                <div key={participant.userId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-semibold text-[#696b73]">
                    {participantName(participant.userId)}
                  </span>
                  <span className="shrink-0 font-extrabold text-[#393a40]">
                    {displayCents(participant.spentCents)}
                    {participant.pendingCents > 0 && (
                      <small className="ml-1 font-medium text-[#9698a0]">
                        + {displayCents(participant.pendingCents)} pendente
                      </small>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function budgetMessage(
  usage: BudgetUsage,
  displayCents: (valueCents: number) => string,
) {
  if (usage.health === "exceeded") {
    return `O limite foi ultrapassado em ${displayCents(Math.abs(usage.remainingCents))}.`;
  }
  if (usage.projectedRemainingCents < 0) {
    return `Com as despesas pendentes, a projeção ultrapassa o limite em ${displayCents(Math.abs(usage.projectedRemainingCents))}.`;
  }
  if (usage.health === "critical") {
    return usage.remainingCycleDays > 0
      ? `Restam ${displayCents(usage.remainingCents)}. Para ficar no limite, use em média até ${displayCents(usage.suggestedDailyCents)} por dia.`
      : `Restam ${displayCents(usage.remainingCents)} antes de atingir o limite.`;
  }
  if (usage.health === "attention") {
    return usage.remainingCycleDays > 0
      ? `O uso está à frente do ciclo. Para ajustar o ritmo, use em média até ${displayCents(usage.suggestedDailyCents)} por dia.`
      : `O uso terminou em ${Math.round(usage.usedPercentage)}% do limite.`;
  }
  if (usage.pendingCents > 0) {
    return `Após os compromissos pendentes, ainda restam ${displayCents(usage.projectedRemainingCents)}.`;
  }
  if (usage.threshold >= 50) {
    return `Metade do limite já foi utilizada; ainda há ${displayCents(usage.remainingCents)} para o ciclo.`;
  }
  return `Há ${displayCents(usage.remainingCents)} disponíveis para o restante do ciclo.`;
}

function EmptyBudgets({
  canEdit,
  onCreate,
}: {
  canEdit: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="app-card grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#635bff]">
          <Gauge size={25} />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">Comecem por uma categoria</h2>
        <p className="mt-2 text-sm leading-6 text-[#858892]">
          Definam juntos quanto cabe em uma categoria neste ciclo. O acompanhamento usa apenas despesas com divisão válida.
        </p>
        {canEdit && (
          <Button onClick={onCreate} className="mt-5">
            <Plus size={16} className="mr-2" /> Criar primeiro limite
          </Button>
        )}
      </div>
    </section>
  );
}
