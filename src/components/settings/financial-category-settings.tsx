"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, Loader2, Pencil, Save, Tags } from "lucide-react";
import {
  createFinancialCategory,
  getFinancialCategories,
  updateFinancialCategory,
} from "@/actions/category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/contexts/workspace-context";
import type { FinancialCategory } from "@/lib/finance/category-types";

export function FinancialCategorySettings() {
  const { activeWorkspace } = useWorkspace();
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string>();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<FinancialCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const loadCategories = useCallback(async () => {
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId) {
      setCategories([]);
      setCanEdit(false);
      setLoadedWorkspaceId(undefined);
      setLoading(false);
      return;
    }

    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    let result = await getFinancialCategories(workspaceId);
    if (!result.success && result.error === "workspace_changed") {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      result = await getFinancialCategories(workspaceId);
    }
    if (sequence !== requestSequence.current) return;

    if (result.success) {
      setCategories(result.categories);
      setCanEdit(result.canEdit);
    } else {
      setCategories([]);
      setCanEdit(false);
      setError(
        result.error === "workspace_changed"
          ? "O nosso espaço mudou. Atualize a página para continuar."
          : result.error,
      );
    }
    setLoadedWorkspaceId(workspaceId);
    setLoading(false);
  }, [activeWorkspace?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEditing(null);
      setName("");
      setError("");
      void loadCategories();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
    };
  }, [loadCategories]);

  const currentCategories = useMemo(
    () =>
      activeWorkspace?.id && loadedWorkspaceId === activeWorkspace.id
        ? categories
        : [],
    [activeWorkspace?.id, categories, loadedWorkspaceId],
  );
  const orderedCategories = useMemo(
    () =>
      [...currentCategories].sort((left, right) => {
        if (left.isBuiltIn !== right.isBuiltIn) return left.isBuiltIn ? -1 : 1;
        return left.name.localeCompare(right.name, "pt-BR");
      }),
    [currentCategories],
  );
  const effectiveCanEdit =
    Boolean(activeWorkspace?.id) &&
    loadedWorkspaceId === activeWorkspace?.id &&
    canEdit;

  function startEdit(category: FinancialCategory) {
    setEditing(category);
    setName(category.name);
    setError("");
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId || workspaceId !== loadedWorkspaceId || !effectiveCanEdit) {
      setError("O nosso espaço mudou. Aguarde o carregamento e tente novamente.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const result = editing
        ? await updateFinancialCategory(editing.id, { name }, workspaceId)
        : await createFinancialCategory({ name }, workspaceId);
      if (!result.success) {
        setError(
          ("error" in result && result.error) ||
            "Não foi possível salvar a categoria.",
        );
        return;
      }
      resetForm();
      await loadCategories();
    } catch {
      setError("Não foi possível salvar a categoria. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="app-card overflow-hidden" aria-labelledby="financial-categories-title">
      <div className="app-card-header">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0efff] text-[#635bff]">
            <Tags size={19} />
          </span>
          <div>
            <h2 id="financial-categories-title">Categorias financeiras</h2>
            <p>
              Um único catálogo para movimentações e orçamentos do nosso espaço.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-40 place-items-center p-6 text-[#8b8d95]">
          <Loader2 className="animate-spin" size={24} aria-label="Carregando categorias" />
        </div>
      ) : (
        <>
          {effectiveCanEdit && (
            <form onSubmit={submit} className="border-b border-[#efedf0] bg-[#faf9fb] p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Nome da categoria</span>
                  <Input
                    required
                    minLength={2}
                    maxLength={40}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={editing ? "Novo nome da categoria" : "Ex.: Reforma da casa"}
                    className="h-11 bg-white"
                  />
                </label>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={submitting || !name.trim()}>
                  {submitting ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : editing ? (
                    <Save size={16} className="mr-2" />
                  ) : (
                    <FolderPlus size={16} className="mr-2" />
                  )}
                  {editing ? "Salvar nome" : "Adicionar categoria"}
                </Button>
              </div>
              {editing && (
                <p className="mt-2 text-xs leading-5 text-[#7d7f87]">
                  Movimentações antigas mantêm o nome registrado, mas continuam vinculadas à categoria.
                </p>
              )}
            </form>
          )}

          {error && (
            <p role="alert" className="mx-4 mt-4 rounded-xl border border-[#f0d3cf] bg-[#fff8f6] px-4 py-3 text-sm text-[#b84e45] sm:mx-5">
              {error}
            </p>
          )}

          {!effectiveCanEdit && !error && (
            <p className="border-b border-[#efedf0] bg-[#faf9fb] px-5 py-3 text-sm text-[#777a83]">
              Você pode consultar o catálogo, mas somente responsáveis pelo espaço podem alterá-lo.
            </p>
          )}

          <div className="grid max-h-[420px] gap-2 overflow-y-auto p-4 custom-scrollbar sm:grid-cols-2 sm:p-5">
            {orderedCategories.map((category) => (
              <article
                key={category.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e7e4e8] bg-white p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f0efff] text-xs font-black text-[#635bff]">
                  {category.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#35363c]">{category.name}</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-[#999aa1]">
                    {category.isBuiltIn ? "Pronta" : "Personalizada"}
                    {category.defaultName && category.defaultName !== category.name
                      ? ` · antes: ${category.defaultName}`
                      : ""}
                  </p>
                </div>
                {effectiveCanEdit && (
                  <button
                    type="button"
                    aria-label={`Editar categoria ${category.name}`}
                    title="Editar nome"
                    onClick={() => startEdit(category)}
                    className="rounded-lg p-2 text-[#858790] transition hover:bg-[#f3f1f5] hover:text-[#5d55dd]"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
