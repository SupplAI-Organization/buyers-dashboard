import { promises as fs } from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

export type KnowledgeHit =
  | {
      kind: "concept";
      slug: string;
      title: string;
      excerpt: string;
      score: number;
    }
  | {
      kind: "product";
      id: string;
      name: string;
      category: string;
      excerpt: string;
      score: number;
    }
  | {
      kind: "seller";
      id: string;
      business_name: string;
      business_type: string | null;
      excerpt: string;
      score: number;
    }
  | {
      kind: "category";
      slug: string;
      title: string;
      excerpt: string;
      score: number;
    };

const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","of","to","in","on","at","by","for",
  "with","and","or","but","if","then","else","when","while","as","this","that","these","those",
  "it","its","i","you","we","they","he","she","my","your","our","their","what","which","who",
  "how","do","does","did","can","could","should","would","will","shall","may","might","must",
  "have","has","had","not","no","yes","please","tell","me","about","there","here","also","just",
]);

type ConceptChunk = {
  slug: string;
  title: string;
  text: string;
  chunkIdx: number;
  tokens: Map<string, number>;
};

let conceptChunkCache: ConceptChunk[] | null = null;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function chunkMarkdown(content: string, size = 600): string[] {
  // Split on blank lines first (paragraphs), then accumulate paragraphs into
  // chunks until hitting `size` chars. Keeps semantic boundaries cleaner than
  // a hard char-slice.
  const paras = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > size && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

async function loadConceptChunks(): Promise<ConceptChunk[]> {
  if (conceptChunkCache) return conceptChunkCache;

  const dir = path.join(process.cwd(), "content");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    conceptChunkCache = [];
    return conceptChunkCache;
  }

  const out: ConceptChunk[] = [];
  for (const filename of entries) {
    if (!filename.toLowerCase().endsWith(".md")) continue;
    const slug = filename.replace(/\.md$/i, "").toLowerCase();
    const content = await fs.readFile(path.join(dir, filename), "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = (titleMatch?.[1] ?? slug).trim();

    // Strip wiki-link decoration so it doesn't pollute scoring.
    const clean = content.replace(/\[\[([^\]]+?)\]\]/g, "$1");
    const chunks = chunkMarkdown(clean);
    chunks.forEach((text, i) => {
      out.push({
        slug,
        title,
        text,
        chunkIdx: i,
        tokens: termFreq(tokenize(`${title} ${text}`)),
      });
    });
  }

  conceptChunkCache = out;
  return out;
}

function scoreChunk(queryTokens: Map<string, number>, chunk: ConceptChunk): number {
  let score = 0;
  for (const [term, qf] of queryTokens) {
    const cf = chunk.tokens.get(term);
    if (cf) score += qf * cf;
  }
  // Boost for hits in the title (length-normalised).
  return score;
}

function snippet(text: string, queryTokens: Map<string, number>, maxLen = 240): string {
  const lower = text.toLowerCase();
  let bestIdx = -1;
  for (const term of queryTokens.keys()) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) bestIdx = idx;
  }
  const start = Math.max(0, bestIdx >= 0 ? bestIdx - 60 : 0);
  const end = Math.min(text.length, start + maxLen);
  const piece = text.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + piece + (end < text.length ? "…" : "");
}

export async function searchKnowledge(
  supabase: SupabaseClient,
  query: string,
  limit = 6,
): Promise<KnowledgeHit[]> {
  const qTokens = termFreq(tokenize(query));
  if (qTokens.size === 0) return [];

  const chunks = await loadConceptChunks();

  // ── Score concept chunks, keep best chunk per slug ─────────────────────────
  const bySlug = new Map<string, { chunk: ConceptChunk; score: number }>();
  for (const c of chunks) {
    const s = scoreChunk(qTokens, c);
    if (s <= 0) continue;
    const cur = bySlug.get(c.slug);
    if (!cur || s > cur.score) bySlug.set(c.slug, { chunk: c, score: s });
  }

  const conceptHits: KnowledgeHit[] = Array.from(bySlug.values()).map((v) => ({
    kind: "concept",
    slug: v.chunk.slug,
    title: v.chunk.title,
    excerpt: snippet(v.chunk.text, qTokens),
    score: v.score,
  }));

  // ── Marketplace nodes via Supabase ilike ───────────────────────────────────
  const trimmed = query.trim();
  const ilike = `%${trimmed}%`;

  const [{ data: products }, { data: sellers }, { data: categoriesRaw }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category, description, certification, origin_country")
      .eq("is_listed", true)
      .or(
        `name.ilike.${ilike},description.ilike.${ilike},category.ilike.${ilike},certification.ilike.${ilike}`,
      )
      .limit(8),
    supabase
      .from("users")
      .select("id, business_name, business_type, business_address")
      .eq("role", "seller")
      .or(`business_name.ilike.${ilike},business_type.ilike.${ilike}`)
      .limit(6),
    supabase
      .from("products")
      .select("category")
      .eq("is_listed", true)
      .ilike("category", ilike)
      .limit(50),
  ]);

  const productHits: KnowledgeHit[] = (products ?? []).map((p) => {
    const blob = `${p.name ?? ""} ${p.category ?? ""} ${p.description ?? ""} ${p.certification ?? ""}`;
    const s = scoreChunk(qTokens, {
      slug: p.id as string,
      title: p.name as string,
      text: blob,
      chunkIdx: 0,
      tokens: termFreq(tokenize(blob)),
    });
    return {
      kind: "product",
      id: p.id as string,
      name: (p.name as string) ?? "Product",
      category: (p.category as string) ?? "",
      excerpt: snippet(blob, qTokens),
      score: s + 0.5, // light prior so a marketplace hit can compete
    };
  });

  const sellerHits: KnowledgeHit[] = (sellers ?? []).map((s) => {
    const blob = `${s.business_name ?? ""} ${s.business_type ?? ""} ${s.business_address ?? ""}`;
    const sc = scoreChunk(qTokens, {
      slug: s.id as string,
      title: s.business_name as string,
      text: blob,
      chunkIdx: 0,
      tokens: termFreq(tokenize(blob)),
    });
    return {
      kind: "seller",
      id: s.id as string,
      business_name: (s.business_name as string) ?? "Seller",
      business_type: (s.business_type as string) ?? null,
      excerpt: snippet(blob, qTokens) || (s.business_type as string) || "",
      score: sc + 0.5,
    };
  });

  const categoryCounts = new Map<string, number>();
  (categoriesRaw ?? []).forEach((r) => {
    const c = r.category as string | null;
    if (!c) return;
    categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
  });
  const categoryHits: KnowledgeHit[] = Array.from(categoryCounts.entries())
    .slice(0, 4)
    .map(([title, count]) => ({
      kind: "category",
      // Match the marketplace graph node id: `category-<raw title>` (see
      // app/lib/marketplaceGraph.ts CATEGORY_PREFIX) so the KB ?node deep
      // link can focus the node.
      slug: title,
      title,
      excerpt: `${count} listing${count === 1 ? "" : "s"} in this category`,
      score: 1,
    }));

  // ── Merge, sort, cap ───────────────────────────────────────────────────────
  const all = [...conceptHits, ...productHits, ...sellerHits, ...categoryHits];
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, limit);
}
