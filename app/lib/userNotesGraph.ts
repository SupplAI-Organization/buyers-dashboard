import { supabase } from "./supabaseClient";
import type { GraphData, GraphEdge } from "./graph";
import { composeEdgeWeights } from "./graphWeights";

const WIKI_LINK = /\[\[([^\]\n]+?)\]\]/g;

/**
 * Load the authenticated buyer's custom notes from Supabase and merge them
 * into the seed concept graph (which comes from /content/*.md on the server).
 *
 * Wiki-links from a user note can target seed concepts OR other user notes.
 * Edges are deduped against the seed edge set.
 */
export async function mergeUserNotes(seed: GraphData): Promise<GraphData> {
  const { data: rows, error } = await supabase
    .from("kb_notes")
    .select("id, title, content, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[mergeUserNotes] load failed:", error.message);
    return seed;
  }
  if (!rows || rows.length === 0) return seed;

  const details = { ...seed.details };
  const nodes = [...seed.nodes];

  for (const r of rows) {
    const id = r.id as string;
    if (details[id]) continue; // seed wins on slug collision
    details[id] = {
      kind: "concept",
      id,
      title: (r.title as string) || id,
      content: r.content as string,
    };
    nodes.push({
      id,
      label: (r.title as string) || id,
      kind: "concept",
    });
  }

  // Index seed edges by undirected pair so multiple references from user
  // notes (or repeated [[links]]) bump the existing edge's weight rather
  // than getting silently dropped.
  const edgeByPair = new Map<string, GraphEdge>();
  for (const e of seed.edges) {
    const key = [e.source, e.target].sort().join("|");
    edgeByPair.set(key, { ...e });
  }

  for (const r of rows) {
    const sourceId = r.id as string;
    const content = r.content as string;
    for (const match of content.matchAll(WIKI_LINK)) {
      const targetId = match[1].trim().toLowerCase();
      if (!targetId || targetId === sourceId || !details[targetId]) continue;
      const [a, b] = [sourceId, targetId].sort();
      const key = `${a}|${b}`;
      const existing = edgeByPair.get(key);
      if (existing) {
        existing.weight += 1;
      } else {
        edgeByPair.set(key, { id: `e-${key}`, source: a, target: b, weight: 1 });
      }
    }
  }

  const edges: GraphEdge[] = Array.from(edgeByPair.values());

  // Recency context: age each edge by the freshest endpoint (whichever note
  // was edited most recently drives the recency factor — keeps active
  // discussions visually loud).
  const noteAgeDays = new Map<string, number>();
  const now = Date.now();
  for (const r of rows) {
    const t = Date.parse((r.updated_at as string) ?? "");
    if (Number.isFinite(t)) {
      noteAgeDays.set(r.id as string, Math.max(0, (now - t) / (1000 * 60 * 60 * 24)));
    }
  }
  const edgeAgeDays = new Map<string, number>();
  for (const e of edges) {
    const a = noteAgeDays.get(e.source);
    const b = noteAgeDays.get(e.target);
    if (a === undefined && b === undefined) continue;
    edgeAgeDays.set(e.id, Math.min(a ?? Infinity, b ?? Infinity));
  }

  const conceptIds = new Set(nodes.filter((n) => n.kind === "concept").map((n) => n.id));
  const weighted = composeEdgeWeights(edges, { nodes, edgeAgeDays }, { conceptIds });

  return { nodes, edges: weighted, details };
}
