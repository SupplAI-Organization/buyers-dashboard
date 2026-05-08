import type { GraphEdge, GraphNode } from "./graph";

// ── Factor functions ────────────────────────────────────────────────────────
//
// Each pass returns a parallel array of multipliers (one per input edge) so we
// can multiply them together at the end. Missing inputs collapse to 1.0 so
// signals can be turned on incrementally without breaking the graph.

export type WeightContext = {
  nodes: GraphNode[];
  // Phase B (commercial)
  verifiedSellerIds?: Set<string>;
  priceMultiplierByEdge?: Map<string, number>;
  certifiedProductIds?: Set<string>;
  toolMultiplierByEdge?: Map<string, number>;
  // Phase C (recency)
  edgeAgeDays?: Map<string, number>;
  recencyHalfLifeDays?: number;
};

const ones = (n: number): number[] => Array.from({ length: n }, () => 1);

/** 1 / sqrt(deg(s) * deg(t)) — suppresses hub-node domination. */
export function structuralFactors(edges: GraphEdge[]): number[] {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  return edges.map((e) => {
    const ds = degree.get(e.source) ?? 1;
    const dt = degree.get(e.target) ?? 1;
    return 1 / Math.sqrt(ds * dt);
  });
}

/**
 * Concept-only quality factor: ×1.5 if both notes link to each other (signal
 * inferred from edge presence; this composer treats the edge list as the
 * ground truth so a mutually-linked pair only appears once anyway, but we
 * still boost based on how dense the local neighbourhood is via Jaccard).
 *
 * For each edge (s, t):
 *   factor = 1 + 0.5 × |N(s) ∩ N(t)| / |N(s) ∪ N(t)|
 */
export function conceptQualityFactors(
  edges: GraphEdge[],
  conceptIds: Set<string>,
): number[] {
  const neighbors = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
    if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
    neighbors.get(e.source)!.add(e.target);
    neighbors.get(e.target)!.add(e.source);
  }
  return edges.map((e) => {
    const isConcept = conceptIds.has(e.source) && conceptIds.has(e.target);
    if (!isConcept) return 1;
    const ns = neighbors.get(e.source) ?? new Set();
    const nt = neighbors.get(e.target) ?? new Set();
    let inter = 0;
    for (const id of ns) if (nt.has(id)) inter += 1;
    const union = ns.size + nt.size - inter;
    if (union === 0) return 1;
    return 1 + 0.5 * (inter / union);
  });
}

/** Verified seller (×1.5), certified product (×1.2), price competitiveness. */
export function commercialFactors(
  edges: GraphEdge[],
  ctx: WeightContext,
): number[] {
  const { verifiedSellerIds, certifiedProductIds, priceMultiplierByEdge, toolMultiplierByEdge } =
    ctx;
  return edges.map((e) => {
    let f = 1;
    if (verifiedSellerIds?.has(e.source) || verifiedSellerIds?.has(e.target)) f *= 1.5;
    if (certifiedProductIds?.has(e.source) || certifiedProductIds?.has(e.target)) f *= 1.2;
    const price = priceMultiplierByEdge?.get(e.id);
    if (typeof price === "number" && Number.isFinite(price)) f *= price;
    const tool = toolMultiplierByEdge?.get(e.id);
    if (typeof tool === "number" && Number.isFinite(tool)) f *= tool;
    return f;
  });
}

/** exp(-ageDays / halfLife). Default half-life 30 days. */
export function recencyFactors(edges: GraphEdge[], ctx: WeightContext): number[] {
  const ages = ctx.edgeAgeDays;
  if (!ages || ages.size === 0) return ones(edges.length);
  const halfLife = ctx.recencyHalfLifeDays ?? 30;
  return edges.map((e) => {
    const age = ages.get(e.id);
    if (typeof age !== "number" || !Number.isFinite(age) || age < 0) return 1;
    return Math.exp(-age / halfLife);
  });
}

// ── Min-max normalization into legible integer range ────────────────────────

/**
 * Map raw composite weights onto [1, scaleMax] integers so the labels render
 * cleanly and `mapData` always saturates the visual range. If every edge has
 * the same weight (or the edge set is tiny) we fall back to 1.
 */
export function normalizeWeights(raw: number[], scaleMax = 10): number[] {
  if (raw.length === 0) return raw;
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return raw.map(() => 1);
  }
  return raw.map((v) => {
    const n = (v - min) / (max - min);
    return Math.max(1, Math.round(n * (scaleMax - 1)) + 1);
  });
}

// ── Composer ────────────────────────────────────────────────────────────────

export type ComposerOptions = {
  /** Set of node ids treated as concept nodes (drives concept-quality factor). */
  conceptIds?: Set<string>;
  /** Toggle individual passes. All default to true. */
  enableStructural?: boolean;
  enableConceptQuality?: boolean;
  enableCommercial?: boolean;
  enableRecency?: boolean;
};

/**
 * Multiply base weights by every enabled factor pass, then min-max normalize.
 * Returns a new edge array — does not mutate the input.
 */
export function composeEdgeWeights(
  edges: GraphEdge[],
  ctx: WeightContext,
  opts: ComposerOptions = {},
): GraphEdge[] {
  if (edges.length === 0) return edges;

  const enableStructural = opts.enableStructural ?? true;
  const enableConceptQuality = opts.enableConceptQuality ?? true;
  const enableCommercial = opts.enableCommercial ?? true;
  const enableRecency = opts.enableRecency ?? true;

  const base = edges.map((e) => Math.max(1, e.weight ?? 1));
  const factors: number[][] = [];
  if (enableStructural) factors.push(structuralFactors(edges));
  if (enableConceptQuality && opts.conceptIds && opts.conceptIds.size > 0) {
    factors.push(conceptQualityFactors(edges, opts.conceptIds));
  }
  if (enableCommercial) factors.push(commercialFactors(edges, ctx));
  if (enableRecency) factors.push(recencyFactors(edges, ctx));

  const composite = base.map((b, i) => {
    let v = b;
    for (const arr of factors) v *= arr[i];
    return v;
  });

  const normalized = normalizeWeights(composite);
  return edges.map((e, i) => ({
    ...e,
    weight: normalized[i],
    rawWeight: e.rawWeight ?? e.weight ?? base[i],
  }));
}
