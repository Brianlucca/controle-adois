"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ArrowRightLeft,
  Banknote,
  Landmark,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  TrendingUp,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import {
  archiveFinancialAccount,
  createAccountTransfer,
  deleteFinancialAccount,
  getAccountsOverview,
  reverseAccountTransfer,
  saveFinancialAccount,
  unarchiveFinancialAccount,
  updateFinancialAccount,
} from "@/actions/account-actions";
import { AccountFormPanel } from "@/components/accounts/account-form-panel";
import { TransferFormPanel } from "@/components/accounts/transfer-form-panel";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/contexts/preferences-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { summarizeAccountBalances } from "@/lib/finance/account-balances";
import { ACCOUNT_BALANCES_REPAIRED_EVENT } from "@/lib/finance/events";
import {
  ACCOUNT_TYPE_LABELS,
  AccountFormValues,
  AccountOwnerOption,
  AccountTransfer,
  FinancialAccount,
  TransferFormValues,
} from "@/lib/finance/account-types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AccountsPage() {
  const { activeWorkspace } = useWorkspace();
  const { hideValues } = usePreferences();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [ownershipOptions, setOwnershipOptions] = useState<AccountOwnerOption[]>([]);
  const [viewerUserId, setViewerUserId] = useState("");
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"account" | "transfer" | null>(null);
  const [editingAccount, setEditingAccount] =
    useState<FinancialAccount | null>(null);
  const overviewRequestSequence = useRef(0);

  const loadOverview = useCallback(async () => {
    const sequence = ++overviewRequestSequence.current;
    setLoading(true);
    setError("");
    const result = await getAccountsOverview();
    if (sequence !== overviewRequestSequence.current) return;
    if (result.success) {
      setAccounts(result.accounts);
      setTransfers(result.transfers);
      setOwnershipOptions(result.ownershipOptions);
      setViewerUserId(result.viewerUserId);
    } else {
      setError(result.error);
    }
    setLoadedWorkspaceId(activeWorkspace?.id);
    setLoading(false);
  }, [activeWorkspace?.id]);

  useEffect(() => {
    const handleBalancesRepaired = () => void loadOverview();

    window.addEventListener(
      ACCOUNT_BALANCES_REPAIRED_EVENT,
      handleBalancesRepaired,
    );
    const initialLoadTimer = window.setTimeout(() => void loadOverview(), 0);
    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener(
        ACCOUNT_BALANCES_REPAIRED_EVENT,
        handleBalancesRepaired,
      );
      overviewRequestSequence.current += 1;
    };
  }, [loadOverview]);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.archivedAt),
    [accounts],
  );
  const archivedAccounts = useMemo(
    () => accounts.filter((account) => account.archivedAt),
    [accounts],
  );
  const totals = useMemo(
    () => summarizeAccountBalances(accounts, viewerUserId),
    [accounts, viewerUserId],
  );
  const displayValue = (value: number) =>
    hideValues ? "••••••" : formatCurrency(value);

  async function handleSaveAccount(values: AccountFormValues) {
    const result = editingAccount
      ? await updateFinancialAccount(editingAccount.id, values)
      : await saveFinancialAccount(values);
    if (result.success) {
      setPanel(null);
      setEditingAccount(null);
      await loadOverview();
    }
    return result;
  }

  function closeAccountPanel() {
    setPanel(null);
    setEditingAccount(null);
  }

  function openNewAccountPanel() {
    if (panel === "account" && !editingAccount) {
      closeAccountPanel();
      return;
    }
    setEditingAccount(null);
    setPanel("account");
  }

  function openEditAccountPanel(account: FinancialAccount) {
    setEditingAccount(account);
    setPanel("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateTransfer(values: TransferFormValues) {
    const result = await createAccountTransfer(values);
    if (result.success) {
      setPanel(null);
      await loadOverview();
    }
    return result;
  }

  async function handleArchive(account: FinancialAccount) {
    if (
      !window.confirm(
        `Arquivar “${account.name}”? O histórico e o saldo continuarão preservados.`,
      )
    ) {
      return;
    }
    const result = await archiveFinancialAccount(account.id);
    if (!result.success) {
      setError(
        ("error" in result && result.error) ||
          "Não foi possível arquivar a conta.",
      );
      return;
    }
    await loadOverview();
  }

  async function handleUnarchive(account: FinancialAccount) {
    const result = await unarchiveFinancialAccount(account.id);
    if (!result.success) {
      setError(
        ("error" in result && result.error) ||
          "Não foi possível desarquivar a conta.",
      );
      return;
    }
    await loadOverview();
  }

  async function handleDelete(account: FinancialAccount) {
    if (!window.confirm(`Excluir definitivamente “${account.name}”? Contas com movimentações ou transferências não podem ser excluídas.`)) return;
    const result = await deleteFinancialAccount(account.id);
    if (!result.success) {
      setError(
        ("error" in result && result.error) ||
          "Não foi possível excluir a conta.",
      );
      return;
    }
    if (editingAccount?.id === account.id) closeAccountPanel();
    await loadOverview();
  }

  async function handleReverse(transfer: AccountTransfer) {
    if (!window.confirm("Estornar esta transferência nas duas contas?")) return;
    const result = await reverseAccountTransfer(transfer.id);
    if (!result.success) {
      setError(
        ("error" in result && result.error) || "Não foi possível estornar.",
      );
      return;
    }
    await loadOverview();
  }

  return (
    <div className="space-y-6 pb-20">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">Nosso dinheiro</p>
          <h1 className="app-title mt-1">Bancos e contas</h1>
          <p className="mt-2 text-sm text-[#777a83]">
            Veja onde está o dinheiro de {activeWorkspace?.name || "vocês"}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            disabled={activeAccounts.length < 2}
            onClick={() => {
              setEditingAccount(null);
              setPanel(panel === "transfer" ? null : "transfer");
            }}
            className="h-11 border-[#dcd9e4] bg-white"
          >
            <ArrowRightLeft size={17} className="mr-2" /> Transferir
          </Button>
          <Button
            onClick={openNewAccountPanel}
            className="h-11 bg-[#635bff] text-white hover:bg-[#544ce0]"
          >
            <Plus size={17} className="mr-2" /> Nova conta
          </Button>
        </div>
      </section>

      {panel === "account" && (
        <AccountFormPanel
          key={editingAccount?.id || "new-account"}
          ownershipOptions={ownershipOptions}
          viewerUserId={viewerUserId}
          initialValues={
            editingAccount
              ? {
                  name: editingAccount.name,
                  institutionName: editingAccount.institutionName,
                  type: editingAccount.type,
                  ownership: editingAccount.ownership,
                  ownerUserId: editingAccount.ownerUserId,
                  openingBalance: editingAccount.openingBalance,
                  openingBalanceDate: editingAccount.openingBalanceDate,
                }
              : undefined
          }
          onCancel={closeAccountPanel}
          onSubmit={handleSaveAccount}
        />
      )}
      {panel === "transfer" && (
        <TransferFormPanel
          accounts={activeAccounts}
          hideValues={hideValues}
          onCancel={() => setPanel(null)}
          onSubmit={handleCreateTransfer}
        />
      )}

      {error && (
        <div className="rounded-xl border border-[#f0d3cf] bg-[#fff8f6] px-4 py-3 text-sm text-[#b84e45]">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Total nas contas" value={displayValue(totals.total)} featured />
        <Summary label="Seu saldo" value={displayValue(totals.mine)} />
        <Summary
          label="Outros participantes"
          value={displayValue(totals.others)}
          participantCount={totals.otherParticipantCount}
        />
        <Summary label="Compartilhado" value={displayValue(totals.joint)} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-extrabold">Onde está o dinheiro</h2>
            <p className="mt-1 text-xs text-[#8b8d95]">
              Saldos calculados pelo saldo inicial, movimentações pagas e transferências.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#8b8d95]">
            {activeAccounts.length} {activeAccounts.length === 1 ? "conta" : "contas"}
          </span>
        </div>

        {loading || loadedWorkspaceId !== activeWorkspace?.id ? (
          <div className="app-card grid min-h-56 place-items-center">
            <Loader2 className="animate-spin text-[#635bff]" />
          </div>
        ) : activeAccounts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                displayValue={displayValue}
                ownershipLabel={getAccountOwnerLabel(
                  account,
                  ownershipOptions,
                  viewerUserId,
                )}
                onEdit={() => openEditAccountPanel(account)}
                onArchive={() => handleArchive(account)}
                onDelete={() => handleDelete(account)}
              />
            ))}
          </div>
        ) : (
          <div className="app-card px-6 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#635bff]">
              <Landmark size={25} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold">Cadastre a primeira conta</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#858892]">
              Comece pelo banco mais usado pelo casal e informe o saldo inicial.
            </p>
            <Button
              onClick={openNewAccountPanel}
              className="mt-5 bg-[#635bff] text-white hover:bg-[#544ce0]"
            >
              <Plus size={16} className="mr-2" /> Criar primeira conta
            </Button>
          </div>
        )}
      </section>

      <section className="app-card overflow-hidden">
        <div className="app-card-header">
          <div>
            <h2>Transferências recentes</h2>
            <p>Movimentos internos não entram nas receitas ou despesas.</p>
          </div>
        </div>
        <div className="divide-y divide-[#efedf0] px-4">
          {transfers.length ? (
            transfers.slice(0, 12).map((transfer) => {
              const source = accounts.find((account) => account.id === transfer.sourceAccountId);
              const destination = accounts.find(
                (account) => account.id === transfer.destinationAccountId,
              );
              return (
                <div key={transfer.id} className="flex items-center gap-3 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eeebff] text-[#635bff]">
                    <ArrowRightLeft size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold">
                      <span className="truncate">{source?.name || "Conta arquivada"}</span>
                      <ArrowRight size={13} className="shrink-0 text-[#a2a3aa]" />
                      <span className="truncate">{destination?.name || "Conta arquivada"}</span>
                    </p>
                    <p className="mt-1 truncate text-xs text-[#8b8d95]">
                      {formatDate(transfer.date)} · {transfer.description} · {transfer.responsibleName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold">{displayValue(transfer.amount)}</p>
                    {transfer.reversedAt ? (
                      <span className="text-[10px] font-bold uppercase text-[#a2a3aa]">Estornada</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReverse(transfer)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#b75a50] hover:text-[#963e36]"
                      >
                        <RotateCcw size={11} /> Estornar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-sm text-[#9698a0]">
              Nenhuma transferência registrada.
            </p>
          )}
        </div>
      </section>

      {archivedAccounts.length > 0 && (
        <details className="app-card overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-[#777a83]">
            Contas arquivadas ({archivedAccounts.length})
          </summary>
          <div className="grid gap-3 border-t border-[#efedf0] p-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                displayValue={displayValue}
                ownershipLabel={getAccountOwnerLabel(
                  account,
                  ownershipOptions,
                  viewerUserId,
                )}
                onUnarchive={() => handleUnarchive(account)}
                onDelete={() => handleDelete(account)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  featured = false,
  participantCount,
}: {
  label: string;
  value: string;
  featured?: boolean;
  participantCount?: number;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        featured
          ? "border-[#d7d2ff] bg-[#eeebff]"
          : "border-[#e4e2e5] bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#858790]">
          {label}
        </p>
        {participantCount !== undefined && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[#f1efff] px-2 py-1 text-[10px] font-bold text-[#5d55dd]"
            title={`${participantCount} participante${participantCount === 1 ? "" : "s"} além de você`}
          >
            <Users size={12} aria-hidden="true" /> {participantCount}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-black tracking-tight text-[#25262c]">{value}</p>
    </div>
  );
}

function AccountCard({
  account,
  displayValue,
  ownershipLabel,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  account: FinancialAccount;
  displayValue: (value: number) => string;
  ownershipLabel: string;
  onEdit?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className={`app-card p-5 ${account.archivedAt ? "opacity-65" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eeebff] text-[#635bff]">
          <AccountTypeIcon type={account.type} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold">{account.name}</h3>
          <p className="mt-1 truncate text-xs text-[#8b8d95]">
            {account.institutionName || ACCOUNT_TYPE_LABELS[account.type]}
          </p>
        </div>
        {(onEdit || onArchive || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                aria-label={`Editar ${account.name}`}
                title="Editar conta"
                onClick={onEdit}
                className="rounded-lg p-2 text-[#777a83] hover:bg-[#f4f2f5] hover:text-[#5d55dd]"
              >
                <Pencil size={15} />
              </button>
            )}
            {onArchive && (
              <button
                type="button"
                aria-label={`Arquivar ${account.name}`}
                title="Arquivar conta"
                onClick={onArchive}
                className="rounded-lg p-2 text-[#a0a2a9] hover:bg-[#f4f2f5] hover:text-[#5b5d65]"
              >
                <Archive size={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label={`Excluir ${account.name}`}
                title="Excluir conta"
                onClick={onDelete}
                className="rounded-lg p-2 text-[#b84e45] hover:bg-[#fff0ef] hover:text-[#9f3f37]"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      <p
        className={`mt-6 text-2xl font-black tracking-tight ${
          account.currentBalance < 0 ? "text-[#c5554b]" : "text-[#25262c]"
        }`}
      >
        {displayValue(account.currentBalance)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-[#f3f2f4] px-2 py-1 text-[10px] font-bold text-[#73757e]">
          {ACCOUNT_TYPE_LABELS[account.type]}
        </span>
        <span className="rounded-md bg-[#eeebff] px-2 py-1 text-[10px] font-bold text-[#5d55dd]">
          {ownershipLabel}
        </span>
      </div>
      {onUnarchive && (
        <Button
          type="button"
          variant="outline"
          onClick={onUnarchive}
          className="mt-4 h-9 w-full border-[#dcd9e4] bg-white text-xs font-bold text-[#5d55dd] hover:bg-[#f5f3ff]"
        >
          <ArchiveRestore size={14} className="mr-2" /> Desarquivar
        </Button>
      )}
    </article>
  );
}

function getAccountOwnerLabel(
  account: FinancialAccount,
  ownershipOptions: AccountOwnerOption[],
  viewerUserId: string,
) {
  if (!account.ownerUserId) {
    if (account.ownership === "mine") return "Você";
    if (account.ownership === "partner") return "Outro participante";
    return "Compartilhada";
  }
  if (account.ownerUserId === viewerUserId) return "Você";
  return (
    ownershipOptions.find((option) => option.id === account.ownerUserId)?.label ||
    "Participante"
  );
}

function AccountTypeIcon({ type }: { type: FinancialAccount["type"] }) {
  if (type === "savings") return <PiggyBank size={20} />;
  if (type === "cash") return <Banknote size={20} />;
  if (type === "investment") return <TrendingUp size={20} />;
  return <WalletCards size={20} />;
}
