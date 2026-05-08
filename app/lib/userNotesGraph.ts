import { supabase } from "./supabaseClient";
import type { GraphData, GraphEdge } from "./graph";

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
    .select("id, title, content")
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

  const edges: GraphEdge[] = [...seed.edges];
  const seen = new Set(edges.map((e) => [e.source, e.target].sort().join("|")));

  for (const r of rows) {
    const sourceId = r.id as string;
    const content = r.content as string;
    for (const match of content.matchAll(WIKI_LINK)) {
      const targetId = match[1].trim().toLowerCase();
      if (!targetId || targetId === sourceId || !details[targetId]) continue;
      const key = [sourceId, targetId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ id: `e-${key}`, source: sourceId, target: targetId });
    }
  }

  return { nodes, edges, details };
}
