import { promises as fs } from "fs";
import path from "path";

// A node belongs to exactly one of these kinds. The renderer reads `kind`
// to decide colour/size, and the drawer reads it to decide which template
// to render.
export type GraphNodeKind = "concept" | "seller" | "product" | "category";

export type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  /** Optional weight used by the renderer for size mapping (e.g. listing count). */
  weight?: number;
};

export type GraphEdge = { id: string; source: string; target: string };

// ── Detail shapes per node kind ──────────────────────────────────────────────

export type ConceptDetail = {
  kind: "concept";
  id: string;
  title: string;
  content: string;
};

export type SellerDetail = {
  kind: "seller";
  id: string;
  sellerId: string;
  title: string;
  business_type: string | null;
  business_address: string | null;
  is_verified: boolean;
  listing_count: number;
  categories: string[];
};

export type ProductDetail = {
  kind: "product";
  id: string;
  productId: string;
  title: string;
  category: string;
  price_per_unit: string;
  unit_type: string;
  seller_name: string;
  available_quantity: string;
  min_order_quantity: string;
  certification: string | null;
  origin: string | null;
};

export type CategoryDetail = {
  kind: "category";
  id: string;
  title: string;
  product_count: number;
  seller_count: number;
};

export type GraphDetail = ConceptDetail | SellerDetail | ProductDetail | CategoryDetail;

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  details: Record<string, GraphDetail>;
};

// ── Concept (markdown) loader ────────────────────────────────────────────────

const WIKI_LINK = /\[\[([^\]\n]+?)\]\]/g;

function idFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, "").toLowerCase();
}

function titleFromContent(content: string, fallback: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return (m?.[1] ?? fallback).trim();
}

export async function loadGraph(): Promise<GraphData> {
  const dir = path.join(process.cwd(), "content");

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return { nodes: [], edges: [], details: {} };
  }

  const mdFiles = entries.filter((f) => f.toLowerCase().endsWith(".md"));

  const details: Record<string, GraphDetail> = {};
  const nodes: GraphNode[] = [];

  for (const filename of mdFiles) {
    const id = idFromFilename(filename);
    const content = await fs.readFile(path.join(dir, filename), "utf8");
    const fallback = filename.replace(/\.md$/i, "");
    const title = titleFromContent(content, fallback);

    details[id] = { kind: "concept", id, title, content };
    nodes.push({ id, label: title, kind: "concept" });
  }

  const seenPairs = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const filename of mdFiles) {
    const sourceId = idFromFilename(filename);
    const detail = details[sourceId];
    if (detail.kind !== "concept") continue;

    for (const match of detail.content.matchAll(WIKI_LINK)) {
      const targetId = match[1].trim().toLowerCase();
      if (!targetId || targetId === sourceId) continue;
      if (!details[targetId]) continue;

      const pair = [sourceId, targetId].sort().join("|");
      if (seenPairs.has(pair)) continue;
      seenPairs.add(pair);

      edges.push({ id: `e-${pair}`, source: sourceId, target: targetId });
    }
  }

  return { nodes, edges, details };
}
