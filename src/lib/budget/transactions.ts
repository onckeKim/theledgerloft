import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUuid, likePattern } from "./schemas";

export const PAGE_SIZE = 20;

/** Transactions for a period with optional category and text filters (PRD US-28). RLS scopes to the household. */
export async function listTransactions({
  period,
  categoryId,
  q,
  page,
}: {
  period: string;
  categoryId?: string;
  q?: string;
  page: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions_manual")
    .select("id, kind, amount_cents, occurred_on, description, category_id, categories(name)", {
      count: "exact",
    })
    .eq("period", period)
    .is("deleted_at", null)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, page * PAGE_SIZE - 1);
  if (categoryId && isUuid(categoryId)) query = query.eq("category_id", categoryId);
  if (q && q.trim()) query = query.ilike("description", likePattern(q));
  const { data, count, error } = await query;
  if (error) throw new Error("Could not load transactions");
  return {
    rows: (data ?? []).map((t) => ({
      id: t.id,
      kind: t.kind as "income" | "outflow" | "refund",
      cents: t.amount_cents,
      date: t.occurred_on,
      description: t.description,
      categoryId: t.category_id,
      category: t.categories?.name ?? null,
    })),
    total: count ?? 0,
  };
}

export async function getTransaction(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions_manual")
    .select("id, kind, amount_cents, occurred_on, description, category_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

/** Active categories for pickers, grouped in display order. */
export async function listCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, category_group, system_key")
    .is("archived_at", null)
    .order("sort_order")
    .order("name");
  return data ?? [];
}
