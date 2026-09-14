"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Landmark, Loader2 } from "lucide-react";
import { getAccountBalanceOverview } from "@/actions/account-actions";
import { usePreferences } from "@/contexts/preferences-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { FinancialAccount } from "@/lib/finance/account-types";
import { summarizeAccountBalances } from "@/lib/finance/account-balances";
import { formatCurrency } from "@/lib/utils";

export function AccountBalanceOverview() {
  const { activeWorkspace } = useWorkspace();
  const { hideValues } = usePreferences();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    getAccountBalanceOverview()
      .then((result) => {
        if (mounted) {
          setAccounts(
            result.success
              ? result.accounts.filter((account) => !account.archivedAt)
              : [],
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadedWorkspaceId(activeWorkspace?.id);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [activeWorkspace?.id]);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((left, right) => right.currentBalance - left.currentBalance),
    [accounts],
  );
  const total = summarizeAccountBalances(accounts).total;
  const displayValue = (value: number) =>
    hideValues ? "••••••" : formatCurrency(value);

  return (
    <section className="app-card overflow-hidden">
      <div className="app-card-header">
        <div>
          <h2 className="flex items-center gap-2">
            <Landmark size={16} className="text-[#635bff]" /> Saldo por conta
          </h2>
          <p>Onde o dinheiro está neste momento.</p>
        </div>
        <Link href="/dashboard/accounts" className="app-link">
          Ver contas <ArrowRight size={14} />
        </Link>
      </div>
      {loading || loadedWorkspaceId !== activeWorkspace?.id ? (
        <div className="grid min-h-28 place-items-center">
          <Loader2 size={19} className="animate-spin text-[#635bff]" />
        </div>
      ) : accounts.length ? (
        <div className="grid gap-4 p-5 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#858790]">
              Total nas contas
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight">
              {displayValue(total)}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {sortedAccounts.slice(0, 3).map((account) => (
              <div
                key={account.id}
                className="rounded-xl border border-[#ebe9ed] bg-[#faf9fb] px-3 py-3"
              >
                <p className="truncate text-[11px] font-semibold text-[#777a83]">
                  {account.institutionName || account.name}
                </p>
                <p className="mt-1 truncate text-sm font-extrabold">
                  {displayValue(account.currentBalance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#858892]">
            Cadastre uma conta para separar o saldo por banco.
          </p>
          <Link
            href="/dashboard/accounts"
            className="text-sm font-bold text-[#5d55dd] hover:text-[#4840c5]"
          >
            Cadastrar primeira conta
          </Link>
        </div>
      )}
    </section>
  );
}
