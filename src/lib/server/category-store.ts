import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { StoredCategorySchema } from "@/lib/finance/category-schema";
import {
  buildFinancialCategoryCatalog,
  type StoredCategoryRecord,
} from "@/lib/finance/category-catalog";

export const MAX_CATEGORY_RECORDS_PER_WORKSPACE = 64;

export async function readFinancialCategoryCatalog(
  workspaceRef: FirebaseFirestore.DocumentReference,
) {
  const snapshot = await workspaceRef
    .collection("categories")
    .limit(MAX_CATEGORY_RECORDS_PER_WORKSPACE)
    .get();
  const records = snapshot.docs.flatMap((document) => {
    const parsed = StoredCategorySchema.safeParse(document.data());
    if (!parsed.success) return [];
    const data = document.data();
    return [
      {
        id: document.id,
        ...parsed.data,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
      } satisfies StoredCategoryRecord,
    ];
  });
  return buildFinancialCategoryCatalog(records);
}

export function toStoredCategoryRecord(id: string, data: DocumentData) {
  const parsed = StoredCategorySchema.safeParse(data);
  if (!parsed.success) return null;
  return {
    id,
    ...parsed.data,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  } satisfies StoredCategoryRecord;
}

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}
