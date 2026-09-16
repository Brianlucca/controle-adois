"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import {
  CategoryIdSchema,
  CategoryInputSchema,
  CategoryWorkspaceIdSchema,
  StoredCategorySchema,
} from "@/lib/finance/category-schema";
import { uniqueCategoryNames } from "@/lib/finance/category-catalog";
import {
  getBuiltInExpenseCategory,
  getBuiltInExpenseCategoryByName,
  normalizeCategoryKey,
} from "@/lib/finance/categories";
import { buildEntityAuditRecord } from "@/lib/finance/audit-log";
import {
  MAX_CATEGORY_RECORDS_PER_WORKSPACE,
  readFinancialCategoryCatalog,
} from "@/lib/server/category-store";
import {
  getAuthenticatedUser,
  getValidatedActiveWorkspace,
  handleAuthFailure,
} from "@/lib/server/action-context";
import { canEditWorkspace } from "@/lib/workspace/membership";

export async function getFinancialCategories(rawWorkspaceId: unknown) {
  const context = await getCategoryContext();
  if (!context) {
    return { success: false as const, error: "unauthenticated", categories: [] };
  }
  if (!isExpectedWorkspace(rawWorkspaceId, context.workspaceRef.id)) {
    return {
      success: false as const,
      error: "workspace_changed" as const,
      categories: [],
    };
  }

  try {
    const categories = await readFinancialCategoryCatalog(context.workspaceRef);
    return { success: true as const, categories, canEdit: context.canEdit };
  } catch (error) {
    console.error("get_financial_categories_failed", error);
    return {
      success: false as const,
      error: "Não foi possível carregar as categorias.",
      categories: [],
    };
  }
}

export async function createFinancialCategory(
  rawData: unknown,
  rawWorkspaceId: unknown,
) {
  const context = await getCategoryContext();
  if (!context) return await handleAuthFailure();
  const guard = validateMutationContext(context, rawWorkspaceId);
  if (guard) return guard;

  const parsed = CategoryInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  if (getBuiltInExpenseCategoryByName(parsed.data.name)) {
    return { success: false, error: "Essa categoria já existe nas opções prontas." };
  }

  const categoryRef = context.workspaceRef.collection("categories").doc();
  const nameLockRef = getNameLockRef(context.workspaceRef, parsed.data.name);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const [workspaceSnapshot, nameLock] = await Promise.all([
        transaction.get(context.workspaceRef),
        transaction.get(nameLockRef),
      ]);
      if (!workspaceSnapshot.exists) throw new Error("workspace_not_found");
      if (nameLock.exists) throw new Error("category_name_exists");
      const recordCount = getRecordCount(workspaceSnapshot.data()?.categoryRecordCount);
      if (recordCount >= MAX_CATEGORY_RECORDS_PER_WORKSPACE) {
        throw new Error("category_quota_reached");
      }

      const record = {
        kind: "custom" as const,
        baseCategoryId: null,
        name: parsed.data.name,
        aliases: [],
        createdAt: new Date(),
        createdBy: context.user.uid,
        updatedAt: null,
        updatedBy: null,
      };
      transaction.set(categoryRef, record);
      transaction.set(nameLockRef, {
        categoryId: categoryRef.id,
        createdAt: new Date(),
      });
      transaction.update(context.workspaceRef, {
        categoryRecordCount: recordCount + 1,
      });
      transaction.set(
        context.workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "created",
          entityType: "category",
          entityId: categoryRef.id,
          user: context.user,
          after: record,
        }),
      );
    });
    revalidateCategoryPaths();
    return { success: true, id: categoryRef.id };
  } catch (error) {
    return categoryMutationError(error, "criar");
  }
}

export async function updateFinancialCategory(
  rawCategoryId: unknown,
  rawData: unknown,
  rawWorkspaceId: unknown,
) {
  const context = await getCategoryContext();
  if (!context) return await handleAuthFailure();
  const guard = validateMutationContext(context, rawWorkspaceId);
  if (guard) return guard;

  const categoryId = CategoryIdSchema.safeParse(rawCategoryId);
  const parsed = CategoryInputSchema.safeParse(rawData);
  if (!categoryId.success) return { success: false, error: "Categoria inválida." };
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const builtIn = getBuiltInExpenseCategory(categoryId.data);
  const conflictingBuiltIn = getBuiltInExpenseCategoryByName(parsed.data.name);
  if (conflictingBuiltIn && conflictingBuiltIn.id !== categoryId.data) {
    return { success: false, error: "Já existe uma categoria pronta com esse nome." };
  }

  const categoryRef = context.workspaceRef
    .collection("categories")
    .doc(categoryId.data);
  const nameLockRef = getNameLockRef(context.workspaceRef, parsed.data.name);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const [workspaceSnapshot, currentSnapshot, nameLock] = await Promise.all([
        transaction.get(context.workspaceRef),
        transaction.get(categoryRef),
        transaction.get(nameLockRef),
      ]);
      if (!workspaceSnapshot.exists) throw new Error("workspace_not_found");
      const current = currentSnapshot.exists
        ? StoredCategorySchema.safeParse(currentSnapshot.data())
        : null;
      if (current && !current.success) throw new Error("category_corrupted");
      if (!builtIn && !currentSnapshot.exists) throw new Error("category_not_found");
      if (builtIn && current?.success && current.data.kind !== "override") {
        throw new Error("category_corrupted");
      }
      if (!builtIn && current?.success && current.data.kind !== "custom") {
        throw new Error("category_corrupted");
      }
      const lockedCategoryId = nameLock.data()?.categoryId;
      if (nameLock.exists && lockedCategoryId !== categoryId.data) {
        throw new Error("category_name_exists");
      }

      const currentName =
        current?.success ? current.data.name : builtIn?.name || "";
      const aliases = uniqueCategoryNames([
        ...(current?.success ? current.data.aliases : []),
        ...(builtIn ? [builtIn.name] : []),
        currentName,
      ]).filter(
        (alias) => normalizeCategoryKey(alias) !== normalizeCategoryKey(parsed.data.name),
      );
      if (aliases.length > 32) throw new Error("category_alias_limit");

      const isNewOverride = Boolean(builtIn && !currentSnapshot.exists);
      const recordCount = getRecordCount(workspaceSnapshot.data()?.categoryRecordCount);
      if (isNewOverride && recordCount >= MAX_CATEGORY_RECORDS_PER_WORKSPACE) {
        throw new Error("category_quota_reached");
      }
      const record = {
        kind: builtIn ? ("override" as const) : ("custom" as const),
        baseCategoryId: builtIn?.id || null,
        name: parsed.data.name,
        aliases,
        createdAt: currentSnapshot.data()?.createdAt || new Date(),
        createdBy: currentSnapshot.data()?.createdBy || context.user.uid,
        updatedAt: new Date(),
        updatedBy: context.user.uid,
      };
      transaction.set(categoryRef, record);
      transaction.set(
        nameLockRef,
        { categoryId: categoryId.data, createdAt: new Date() },
        { merge: true },
      );
      if (isNewOverride) {
        transaction.update(context.workspaceRef, {
          categoryRecordCount: recordCount + 1,
        });
      }
      transaction.set(
        context.workspaceRef.collection("auditLogs").doc(),
        buildEntityAuditRecord({
          action: "updated",
          entityType: "category",
          entityId: categoryId.data,
          user: context.user,
          before: currentSnapshot.data() || {
            kind: "built_in",
            name: builtIn?.name,
          },
          after: record,
        }),
      );
    });
    revalidateCategoryPaths();
    return { success: true, id: categoryId.data };
  } catch (error) {
    return categoryMutationError(error, "atualizar");
  }
}

type CategoryContext = {
  user: { uid: string; name?: string; email?: string };
  workspaceRef: FirebaseFirestore.DocumentReference;
  canEdit: boolean;
};

async function getCategoryContext(): Promise<CategoryContext | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const workspace = await getValidatedActiveWorkspace(user.uid);
  if (!workspace) return null;
  return {
    user,
    workspaceRef: adminDb.collection("workspaces").doc(workspace.id),
    canEdit: canEditWorkspace(workspace.data, user.uid),
  };
}

function validateMutationContext(
  context: CategoryContext,
  rawWorkspaceId: unknown,
) {
  if (!isExpectedWorkspace(rawWorkspaceId, context.workspaceRef.id)) {
    return { success: false, error: "O espaço ativo mudou. Tente novamente." };
  }
  if (!context.canEdit) {
    return { success: false, error: "Você não pode alterar este espaço." };
  }
  return null;
}

function isExpectedWorkspace(rawWorkspaceId: unknown, activeWorkspaceId: string) {
  const parsed = CategoryWorkspaceIdSchema.safeParse(rawWorkspaceId);
  return parsed.success && parsed.data === activeWorkspaceId;
}

function getNameLockRef(
  workspaceRef: FirebaseFirestore.DocumentReference,
  name: string,
) {
  const lockId = createHash("sha256")
    .update(normalizeCategoryKey(name))
    .digest("hex")
    .slice(0, 32);
  return workspaceRef.collection("categoryNameKeys").doc(lockId);
}

function getRecordCount(value: unknown) {
  const count = Number(value) || 0;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("category_quota_reached");
  }
  return count;
}

function categoryMutationError(error: unknown, operation: "criar" | "atualizar") {
  const message = error instanceof Error ? error.message : "";
  if (message === "category_name_exists") {
    return { success: false, error: "Já existe uma categoria com esse nome ou nome anterior." };
  }
  if (message === "category_not_found") {
    return { success: false, error: "Categoria não encontrada." };
  }
  if (message === "category_alias_limit") {
    return { success: false, error: "Esta categoria atingiu o limite de alterações de nome." };
  }
  if (message === "category_quota_reached") {
    return {
      success: false,
      error: `Este espaço atingiu o limite de ${MAX_CATEGORY_RECORDS_PER_WORKSPACE} categorias personalizadas ou editadas.`,
    };
  }
  console.error(`financial_category_${operation}_failed`, error);
  return { success: false, error: `Não foi possível ${operation} a categoria.` };
}

function revalidateCategoryPaths() {
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard/transactions");
}
