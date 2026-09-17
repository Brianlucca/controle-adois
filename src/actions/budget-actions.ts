"use server";

import { createHash } from "node:crypto";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import {
  BudgetIdSchema,
  BudgetWorkspaceIdSchema,
  FinancialBudgetSchema,
  StoredFinancialBudgetSchema,
} from "@/lib/finance/budget-schema";
import type {
  FinancialBudget,
  FinancialBudgetInput,
} from "@/lib/finance/budget-types";
import type { FinancialCategory } from "@/lib/finance/category-types";
import { findFinancialCategory } from "@/lib/finance/category-catalog";
import { buildEntityAuditRecord } from "@/lib/finance/audit-log";
import { readFinancialCategoryCatalog } from "@/lib/server/category-store";
import { consumeWorkspaceActionRateLimit } from "@/lib/server/action-rate-limit";
import {
  getAuthenticatedUser,
  getValidatedActiveWorkspace,
  handleAuthFailure,
} from "@/lib/server/action-context";
import {
  canEditWorkspace,
  getWorkspaceMemberId,
} from "@/lib/workspace/membership";

const MAX_BUDGETS_PER_WORKSPACE = 48;
const BUDGET_MUTATION_RATE_LIMIT = { limit: 30, windowMs: 5 * 60_000 };

export async function getFinancialBudgets(rawWorkspaceId: unknown) {
  const context = await getBudgetContext();
  if (!context) {
    return { success: false as const, error: "unauthenticated", budgets: [] };
  }
  const workspaceId = BudgetWorkspaceIdSchema.safeParse(rawWorkspaceId);
  if (!workspaceId.success || workspaceId.data !== context.workspaceRef.id) {
    return {
      success: false as const,
      error: "workspace_changed" as const,
      budgets: [],
    };
  }

  try {
    const [snapshot, categories] = await Promise.all([
      context.workspaceRef
        .collection("budgets")
        .limit(MAX_BUDGETS_PER_WORKSPACE)
        .get(),
      readFinancialCategoryCatalog(context.workspaceRef),
    ]);
    const budgets = snapshot.docs
      .flatMap((document) => {
        const parsed = StoredFinancialBudgetSchema.safeParse(document.data());
        return parsed.success
          ? [toFinancialBudget(document.id, document.data(), categories)]
          : [];
      })
      .sort((left, right) => {
        if (Boolean(left.archivedAt) !== Boolean(right.archivedAt)) {
          return left.archivedAt ? 1 : -1;
        }
        return left.category.localeCompare(right.category, "pt-BR");
      });

    return {
      success: true as const,
      budgets,
      categories,
      canEdit: context.canEdit,
    };
  } catch (error) {
    console.error("get_financial_budgets_failed", error);
    return {
      success: false as const,
      error: "Não foi possível carregar os orçamentos.",
      budgets: [],
    };
  }
}

export async function saveFinancialBudget(
  rawData: unknown,
  rawBudgetId?: unknown,
  rawWorkspaceId?: unknown,
) {
  const context = await getBudgetContext();
  if (!context) return await handleAuthFailure();
  if (!isExpectedWorkspace(rawWorkspaceId, context.workspaceRef.id)) {
    return { success: false, error: "O espaço ativo mudou. Abra o formulário novamente." };
  }
  if (!context.canEdit) {
    return { success: false, error: "Você não pode alterar este espaço." };
  }
  const rateLimitError = await getBudgetRateLimitError(context);
  if (rateLimitError) return rateLimitError;

  const parsed = FinancialBudgetSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  let categories: FinancialCategory[];
  try {
    categories = await readFinancialCategoryCatalog(context.workspaceRef);
  } catch (error) {
    console.error("read_budget_categories_failed", error);
    return { success: false, error: "Não foi possível validar a categoria." };
  }
  const category = categories.find(
    (item) => item.id === parsed.data.categoryId,
  );
  if (!category) {
    return { success: false, error: "Escolha uma categoria deste espaço." };
  }
  const input = {
    ...parsed.data,
    categoryId: category.id,
    category: category.name,
  };
  const participantIds = getParticipantIds(context.workspaceData, context.user.uid);
  if (
    rawBudgetId === undefined &&
    input.scope === "shared" &&
    participantIds.size < 2
  ) {
    return {
      success: false,
      error: "Convide outra pessoa antes de criar um limite do casal.",
    };
  }
  if (!participantIds.has(input.responsibleUserId)) {
    return { success: false, error: "Escolha uma pessoa deste espaço para acompanhar." };
  }
  if (
    input.participantUserId &&
    !participantIds.has(input.participantUserId)
  ) {
    return { success: false, error: "Escolha uma pessoa deste espaço." };
  }

  const limitCents = Math.round(parsed.data.limitAmount * 100);
  if (!Number.isSafeInteger(limitCents) || limitCents <= 0) {
    return { success: false, error: "O limite informado é inválido." };
  }

  if (rawBudgetId !== undefined) {
    const budgetId = BudgetIdSchema.safeParse(rawBudgetId);
    if (!budgetId.success) {
      return { success: false, error: "Orçamento inválido." };
    }
    return updateBudget({
      context,
      id: budgetId.data,
      input,
      categories,
      limitCents,
    });
  }

  const id = createBudgetId(input);
  const budgetRef = context.workspaceRef.collection("budgets").doc(id);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const [workspaceSnapshot, current] = await Promise.all([
        transaction.get(context.workspaceRef),
        transaction.get(budgetRef),
      ]);
      if (!workspaceSnapshot.exists) throw new Error("workspace_not_found");
      if (current.exists) {
        throw new Error(current.data()?.archivedAt ? "budget_archived" : "budget_exists");
      }
      const currentBudgetCount = Number(workspaceSnapshot.data()?.budgetCount) || 0;
      if (
        !Number.isSafeInteger(currentBudgetCount) ||
        currentBudgetCount < 0 ||
        currentBudgetCount >= MAX_BUDGETS_PER_WORKSPACE
      ) {
        throw new Error("budget_quota_reached");
      }

      const record = {
        categoryId: input.categoryId,
        category: input.category,
        limitCents,
        scope: input.scope,
        participantUserId: input.participantUserId || null,
        responsibleUserId: input.responsibleUserId,
        createdAt: new Date(),
        createdBy: context.user.uid,
        updatedAt: null,
        updatedBy: null,
        archivedAt: null,
        archivedBy: null,
      };
      transaction.set(budgetRef, record);
      transaction.update(context.workspaceRef, {
        budgetCount: currentBudgetCount + 1,
      });
      transaction.set(
        context.workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "created",
          entityType: "budget",
          entityId: budgetRef.id,
          user: context.user,
          after: record,
        }),
      );
    });

    revalidateBudgetPaths();
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "budget_exists") {
      return { success: false, error: "Já existe um orçamento igual neste ciclo." };
    }
    if (message === "budget_archived") {
      return { success: false, error: "Este orçamento está arquivado. Desarquive-o para reutilizar." };
    }
    if (message === "budget_quota_reached") {
      return {
        success: false,
        error: `Este espaço atingiu o limite de ${MAX_BUDGETS_PER_WORKSPACE} orçamentos.`,
      };
    }
    console.error("save_financial_budget_failed", error);
    return { success: false, error: "Não foi possível salvar o orçamento." };
  }
}

export async function archiveFinancialBudget(
  rawBudgetId: unknown,
  rawWorkspaceId: unknown,
) {
  return changeBudgetArchiveState(rawBudgetId, rawWorkspaceId, true);
}

export async function unarchiveFinancialBudget(
  rawBudgetId: unknown,
  rawWorkspaceId: unknown,
) {
  return changeBudgetArchiveState(rawBudgetId, rawWorkspaceId, false);
}

export async function deleteFinancialBudget(
  rawBudgetId: unknown,
  rawWorkspaceId: unknown,
) {
  const context = await getBudgetContext();
  if (!context) return await handleAuthFailure();
  if (!isExpectedWorkspace(rawWorkspaceId, context.workspaceRef.id)) {
    return { success: false, error: "O espaço ativo mudou. Tente novamente." };
  }
  if (!context.canEdit) {
    return { success: false, error: "Você não pode alterar este espaço." };
  }
  const rateLimitError = await getBudgetRateLimitError(context);
  if (rateLimitError) return rateLimitError;
  const id = BudgetIdSchema.safeParse(rawBudgetId);
  if (!id.success) return { success: false, error: "Orçamento inválido." };

  const budgetRef = context.workspaceRef.collection("budgets").doc(id.data);
  try {
    await adminDb.runTransaction(async (transaction) => {
      const [workspaceSnapshot, current] = await Promise.all([
        transaction.get(context.workspaceRef),
        transaction.get(budgetRef),
      ]);
      if (!workspaceSnapshot.exists) throw new Error("workspace_not_found");
      if (!current.exists) throw new Error("budget_not_found");
      const before = current.data() || {};
      const currentBudgetCount = Number(workspaceSnapshot.data()?.budgetCount) || 0;

      transaction.delete(budgetRef);
      transaction.update(context.workspaceRef, {
        budgetCount: Math.max(0, currentBudgetCount - 1),
      });
      transaction.set(
        context.workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "deleted",
          entityType: "budget",
          entityId: budgetRef.id,
          user: context.user,
          before,
        }),
      );
    });

    revalidateBudgetPaths();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "budget_not_found") {
      return { success: false, error: "Orçamento não encontrado." };
    }
    console.error("delete_financial_budget_failed", error);
    return { success: false, error: "Não foi possível excluir o orçamento." };
  }
}

async function updateBudget({
  context,
  id,
  input,
  categories,
  limitCents,
}: {
  context: BudgetContext;
  id: string;
  input: FinancialBudgetInput;
  categories: FinancialCategory[];
  limitCents: number;
}) {
  const budgetRef = context.workspaceRef.collection("budgets").doc(id);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(budgetRef);
      if (!current.exists) throw new Error("budget_not_found");
      const before = current.data() || {};
      if (before.archivedAt) throw new Error("budget_archived");
      if (
        findFinancialCategory(
          categories,
          typeof before.categoryId === "string" ? before.categoryId : null,
          typeof before.category === "string" ? before.category : undefined,
        )?.id !== input.categoryId ||
        before.scope !== input.scope ||
        (before.participantUserId || null) !== (input.participantUserId || null)
      ) {
        throw new Error("budget_identity_locked");
      }

      const changes = {
        categoryId: input.categoryId,
        category: input.category,
        limitCents,
        responsibleUserId: input.responsibleUserId,
        updatedAt: new Date(),
        updatedBy: context.user.uid,
      };
      transaction.update(budgetRef, changes);
      transaction.set(
        context.workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "updated",
          entityType: "budget",
          entityId: budgetRef.id,
          user: context.user,
          before,
          after: { ...before, ...changes },
        }),
      );
    });

    revalidateBudgetPaths();
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "budget_not_found") {
      return { success: false, error: "Orçamento não encontrado." };
    }
    if (message === "budget_archived") {
      return { success: false, error: "Desarquive o orçamento antes de editá-lo." };
    }
    if (message === "budget_identity_locked") {
      return {
        success: false,
        error: "Categoria e tipo não podem ser trocados. Crie outro orçamento.",
      };
    }
    console.error("update_financial_budget_failed", error);
    return { success: false, error: "Não foi possível atualizar o orçamento." };
  }
}

async function changeBudgetArchiveState(
  rawBudgetId: unknown,
  rawWorkspaceId: unknown,
  archive: boolean,
) {
  const context = await getBudgetContext();
  if (!context) return await handleAuthFailure();
  if (!isExpectedWorkspace(rawWorkspaceId, context.workspaceRef.id)) {
    return { success: false, error: "O espaço ativo mudou. Tente novamente." };
  }
  if (!context.canEdit) {
    return { success: false, error: "Você não pode alterar este espaço." };
  }
  const rateLimitError = await getBudgetRateLimitError(context);
  if (rateLimitError) return rateLimitError;
  const id = BudgetIdSchema.safeParse(rawBudgetId);
  if (!id.success) return { success: false, error: "Orçamento inválido." };

  const budgetRef = context.workspaceRef.collection("budgets").doc(id.data);
  try {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(budgetRef);
      if (!current.exists) throw new Error("budget_not_found");
      const before = current.data() || {};
      if (Boolean(before.archivedAt) === archive) {
        throw new Error(archive ? "budget_archived" : "budget_active");
      }
      const changes = archive
        ? { archivedAt: new Date(), archivedBy: context.user.uid }
        : {
            archivedAt: null,
            archivedBy: null,
            updatedAt: new Date(),
            updatedBy: context.user.uid,
          };
      transaction.update(budgetRef, changes);
      transaction.set(
        context.workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: archive ? "archived" : "restored",
          entityType: "budget",
          entityId: budgetRef.id,
          user: context.user,
          before,
          after: { ...before, ...changes },
        }),
      );
    });

    revalidateBudgetPaths();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "budget_not_found") {
      return { success: false, error: "Orçamento não encontrado." };
    }
    if (message === "budget_archived") {
      return { success: false, error: "Este orçamento já está arquivado." };
    }
    if (message === "budget_active") {
      return { success: false, error: "Este orçamento já está ativo." };
    }
    console.error("change_financial_budget_archive_failed", error);
    return { success: false, error: "Não foi possível alterar o orçamento." };
  }
}

async function getBudgetContext(): Promise<BudgetContext | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const workspace = await getValidatedActiveWorkspace(user.uid);
  if (!workspace) return null;

  return {
    user,
    workspaceRef: adminDb.collection("workspaces").doc(workspace.id),
    workspaceData: workspace.data,
    canEdit: canEditWorkspace(workspace.data, user.uid),
  };
}

type BudgetContext = {
  user: { uid: string; name?: string; email?: string };
  workspaceRef: FirebaseFirestore.DocumentReference;
  workspaceData: DocumentData;
  canEdit: boolean;
};

function getParticipantIds(workspace: DocumentData, userId: string) {
  return new Set([
    userId,
    ...(workspace.members || [])
      .map(getWorkspaceMemberId)
      .filter((memberId: string | undefined): memberId is string => Boolean(memberId)),
  ]);
}

function createBudgetId(input: FinancialBudgetInput) {
  return createHash("sha256")
    .update(
      [
        input.scope,
        input.participantUserId || "couple",
        input.categoryId,
      ].join("\u0000"),
    )
    .digest("hex")
    .slice(0, 32);
}

function isExpectedWorkspace(rawWorkspaceId: unknown, activeWorkspaceId: string) {
  const parsed = BudgetWorkspaceIdSchema.safeParse(rawWorkspaceId);
  return parsed.success && parsed.data === activeWorkspaceId;
}

function toFinancialBudget(
  id: string,
  data: DocumentData,
  categories: FinancialCategory[],
): FinancialBudget {
  const category = findFinancialCategory(
    categories,
    typeof data.categoryId === "string" ? data.categoryId : null,
    typeof data.category === "string" ? data.category : undefined,
  );
  return {
    id,
    categoryId: category?.id || data.categoryId || "legacy-category",
    category: category?.name || data.category,
    categoryAliases: category?.aliases || [data.category],
    limitCents: Number(data.limitCents) || 0,
    scope: data.scope,
    participantUserId: data.participantUserId || null,
    responsibleUserId: data.responsibleUserId || "",
    createdAt: toIsoString(data.createdAt) || "",
    createdBy: data.createdBy || "",
    updatedAt: toIsoString(data.updatedAt),
    updatedBy: data.updatedBy || null,
    archivedAt: toIsoString(data.archivedAt),
    archivedBy: data.archivedBy || null,
  };
}

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

async function getBudgetRateLimitError(context: BudgetContext) {
  try {
    const rate = await consumeWorkspaceActionRateLimit({
      workspaceRef: context.workspaceRef,
      userId: context.user.uid,
      scope: "budgets:write",
      policy: BUDGET_MUTATION_RATE_LIMIT,
    });
    if (rate.allowed) return null;
    console.warn("security_event", {
      type: "budget_mutation_rate_limit",
      workspaceId: context.workspaceRef.id,
    });
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSeconds / 60));
    return {
      success: false,
      error: `Muitas alterações de orçamento. Aguarde ${minutes} minuto${minutes > 1 ? "s" : ""}.`,
    };
  } catch (error) {
    console.error("budget_rate_limit_failed", error);
    return {
      success: false,
      error: "Não foi possível validar o limite de alterações. Tente novamente.",
    };
  }
}

function revalidateBudgetPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/budgets");
}
