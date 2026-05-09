import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "./supabaseClient";

export type DiscountSlab = {
  id: number;
  supplier_id: string;
  discount_percentage: number;
  minimum_slab: number;
};

export async function fetchSlabsForSuppliers(
  supplierIds: string[],
  client: SupabaseClient = defaultClient,
): Promise<Map<string, DiscountSlab[]>> {
  const out = new Map<string, DiscountSlab[]>();
  if (!supplierIds.length) return out;

  const { data, error } = await client
    .from("discount_slabs")
    .select("id, supplier_id, discount_percentage, minimum_slab")
    .in("supplier_id", supplierIds);

  if (error) {
    console.error("[discountSlabs] fetch failed:", error.message);
    return out;
  }

  for (const row of data ?? []) {
    const slab: DiscountSlab = {
      id: row.id as number,
      supplier_id: row.supplier_id as string,
      discount_percentage: Number(row.discount_percentage) || 0,
      minimum_slab: Number(row.minimum_slab) || 0,
    };
    if (slab.discount_percentage <= 0 || slab.minimum_slab <= 0) continue;
    const list = out.get(slab.supplier_id) ?? [];
    list.push(slab);
    out.set(slab.supplier_id, list);
  }

  // Sort each supplier's slabs ascending by threshold so the renderer can show
  // the next achievable tier without re-sorting.
  for (const list of out.values()) {
    list.sort((a, b) => a.minimum_slab - b.minimum_slab);
  }
  return out;
}

export async function fetchSlabsForSupplier(
  supplierId: string,
  client: SupabaseClient = defaultClient,
): Promise<DiscountSlab[]> {
  const map = await fetchSlabsForSuppliers([supplierId], client);
  return map.get(supplierId) ?? [];
}

/**
 * Pick the best (highest discount %) slab the buyer qualifies for at the
 * given quantity. Returns null if the buyer doesn't meet any threshold.
 */
export function pickApplicableSlab(
  slabs: DiscountSlab[] | undefined,
  quantity: number,
): DiscountSlab | null {
  if (!slabs?.length) return null;
  let best: DiscountSlab | null = null;
  for (const s of slabs) {
    if (quantity >= s.minimum_slab) {
      if (!best || s.discount_percentage > best.discount_percentage) best = s;
    }
  }
  return best;
}

/**
 * Find the next slab the buyer hasn't unlocked yet (smallest minimum_slab
 * strictly greater than the current quantity). Useful for "buy N more for X%
 * extra" hints.
 */
export function pickNextSlab(
  slabs: DiscountSlab[] | undefined,
  quantity: number,
): DiscountSlab | null {
  if (!slabs?.length) return null;
  for (const s of slabs) {
    if (s.minimum_slab > quantity) return s;
  }
  return null;
}
