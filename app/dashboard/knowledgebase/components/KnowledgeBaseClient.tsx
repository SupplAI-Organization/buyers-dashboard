"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import {
  Network,
  X,
  FileText,
  Store,
  Package,
  Tag,
  BadgeCheck,
  Loader2,
  Plus,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { GraphData, GraphDetail } from "@/lib/graph";
import { loadMarketplaceGraph } from "@/lib/marketplaceGraph";
import { mergeUserNotes } from "@/lib/userNotesGraph";
import Sidebar from "../../homepage/components/Sidebar";
import Topbar from "../../homepage/components/Topbar";

const GraphView = dynamic(() => import("./GraphView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
      Loading graph…
    </div>
  ),
});

type Props = { data: GraphData };
type Mode = "concepts" | "marketplace";

export default function KnowledgeBaseClient({ data }: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("concepts");
  const [marketData, setMarketData] = useState<GraphData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  // Concept graph = seed (props) + buyer's saved notes from Supabase.
  const [conceptData, setConceptData] = useState<GraphData>(data);
  const [showAddModal, setShowAddModal] = useState(false);

  const reloadConcepts = async () => {
    const merged = await mergeUserNotes(data);
    setConceptData(merged);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace("/login");
      } else {
        setUser(authData.user);
        // Once authed, pull any custom notes the buyer has saved.
        const merged = await mergeUserNotes(data);
        setConceptData(merged);
      }
      setAuthLoading(false);
    };
    checkUser();
  }, [router, data]);

  // Refetch every time the user enters marketplace mode so newly-persisted
  // chats from /dashboard/agent show up without a hard page reload.
  useEffect(() => {
    if (mode !== "marketplace") return;
    let cancelled = false;
    setMarketLoading(true);
    setMarketError(null);
    loadMarketplaceGraph()
      .then((g) => {
        if (!cancelled) setMarketData(g);
      })
      .catch((err) => {
        if (!cancelled) setMarketError(err?.message ?? "Failed to load marketplace graph");
      })
      .finally(() => {
        if (!cancelled) setMarketLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const refreshMarketplace = () => {
    setMarketLoading(true);
    setMarketError(null);
    loadMarketplaceGraph()
      .then((g) => setMarketData(g))
      .catch((err) => setMarketError(err?.message ?? "Failed to load marketplace graph"))
      .finally(() => setMarketLoading(false));
  };

  const activeData: GraphData =
    mode === "marketplace"
      ? marketData ?? { nodes: [], edges: [], details: {} }
      : conceptData;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#EA7B7B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const detail: GraphDetail | null = selectedId ? activeData.details[selectedId] ?? null : null;
  const isEmpty = activeData.nodes.length === 0;

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <Topbar user={user} />
      <Sidebar />
      <div className="ml-20 transition-all duration-300">
        <main className="px-4 py-6 sm:px-6">
          <header className="mx-auto mb-4 flex w-full max-w-6xl items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Network className="h-3.5 w-3.5 text-indigo-500" />
                Knowledge Base
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {mode === "concepts" ? "Concept graph" : "Marketplace graph"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "marketplace" && marketLoading
                  ? "Building graph from live database…"
                  : `${activeData.nodes.length} node${
                      activeData.nodes.length === 1 ? "" : "s"
                    } · ${activeData.edges.length} link${
                      activeData.edges.length === 1 ? "" : "s"
                    } · click a node to inspect.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
            {mode === "marketplace" && (
              <button
                type="button"
                onClick={refreshMarketplace}
                disabled={marketLoading}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
                title="Reload marketplace graph (picks up new chats)"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${marketLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}

            {mode === "concepts" && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add note
              </button>
            )}

            {/* Mode toggle */}
            <div className="inline-flex items-center rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMode("concepts");
                  setSelectedId(null);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mode === "concepts"
                    ? "bg-[#EA7B7B] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Concepts
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("marketplace");
                  setSelectedId(null);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mode === "marketplace"
                    ? "bg-[#EA7B7B] text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                Marketplace
              </button>
            </div>
            </div>
          </header>

          <div className="relative mx-auto w-full max-w-6xl">
            <div className="relative h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-2xl bg-[#0f172a] shadow-lg ring-1 ring-slate-800">
              {mode === "marketplace" && marketLoading ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                  <div className="text-sm">Querying live marketplace data…</div>
                </div>
              ) : mode === "marketplace" && marketError ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-rose-300">
                  <div className="text-sm font-medium">Could not load marketplace</div>
                  <div className="text-xs text-rose-400/80">{marketError}</div>
                </div>
              ) : isEmpty ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <FileText className="h-8 w-8 text-slate-600" />
                  <div className="text-sm">
                    {mode === "concepts"
                      ? "No markdown files in /content yet."
                      : "No sellers or products found."}
                  </div>
                </div>
              ) : (
                <GraphView
                  key={mode}
                  nodes={activeData.nodes}
                  edges={activeData.edges}
                  selectedId={selectedId}
                  onNodeClick={(id) => setSelectedId(id)}
                />
              )}

              {/* Legend (marketplace only) */}
              {mode === "marketplace" && !marketLoading && !isEmpty && (
                <div className="pointer-events-none absolute top-3 right-4 flex items-center gap-3 rounded-md bg-slate-900/70 px-3 py-1.5 text-[10px] text-slate-300 ring-1 ring-slate-700">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" /> seller
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> product
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> category
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-pink-400" /> chat
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-3 text-[10px] text-slate-500">
                <span>scroll to zoom</span>
                <span>·</span>
                <span>drag background to pan</span>
                <span>·</span>
                <span>drag a node to move it</span>
              </div>
            </div>

            {/* Drawer */}
            <div
              className={`pointer-events-none absolute right-0 top-0 h-full w-full max-w-md transform transition-transform duration-300 ease-out ${
                detail ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {detail && (
                <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <DrawerHeader detail={detail} onClose={() => setSelectedId(null)} />
                  <div className="flex-1 overflow-y-auto">
                    <DrawerBody detail={detail} router={router} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showAddModal && (
        <AddNoteModal
          existingIds={new Set(Object.keys(activeData.details))}
          onClose={() => setShowAddModal(false)}
          onSaved={async (slug) => {
            setShowAddModal(false);
            setSelectedId(slug);
            await reloadConcepts();
          }}
        />
      )}

      <style jsx global>{`
        .prose-knowledge h1 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.75rem;
        }
        .prose-knowledge h2 {
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .prose-knowledge h3 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .prose-knowledge p {
          margin-bottom: 0.75rem;
        }
        .prose-knowledge ul,
        .prose-knowledge ol {
          padding-left: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .prose-knowledge li {
          margin-bottom: 0.25rem;
          list-style: disc;
        }
        .prose-knowledge ol li {
          list-style: decimal;
        }
        .prose-knowledge strong {
          color: #0f172a;
          font-weight: 600;
        }
        .prose-knowledge code {
          background: #f1f5f9;
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-size: 0.85em;
        }
      `}</style>
    </div>
  );
}

// ── Drawer pieces ───────────────────────────────────────────────────────────

function DrawerHeader({ detail, onClose }: { detail: GraphDetail; onClose: () => void }) {
  const { Icon, color } = (() => {
    switch (detail.kind) {
      case "concept":
        return { Icon: FileText, color: "text-slate-500" };
      case "seller":
        return { Icon: Store, color: "text-indigo-500" };
      case "product":
        return { Icon: Package, color: "text-emerald-500" };
      case "category":
        return { Icon: Tag, color: "text-amber-500" };
      case "chat":
        return { Icon: MessageSquare, color: "text-pink-500" };
    }
  })();

  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`h-4 w-4 flex-none ${color}`} />
        <h2 className="truncate text-sm font-semibold text-slate-900">{detail.title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DrawerBody({
  detail,
  router,
}: {
  detail: GraphDetail;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
}) {
  switch (detail.kind) {
    case "concept":
      return (
        <div className="prose-knowledge px-5 py-4 text-sm leading-relaxed text-slate-700">
          <ReactMarkdown>{detail.content}</ReactMarkdown>
        </div>
      );

    case "seller":
      return (
        <div className="px-5 py-4 text-sm text-slate-700 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Seller
            </span>
            {detail.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>

          <DetailRow label="Business type" value={detail.business_type ?? "—"} />
          <DetailRow label="Address" value={detail.business_address ?? "—"} />
          <DetailRow label="Active listings" value={String(detail.listing_count)} />

          {detail.categories.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-500">Categories</div>
              <div className="flex flex-wrap gap-1.5">
                {detail.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/homepage2?supplier_id=${detail.sellerId}`)
            }
            className="mt-2 w-full rounded-lg bg-[#EA7B7B] px-3 py-2 text-xs font-medium text-white hover:bg-[#d96868]"
          >
            View seller's catalog
          </button>
        </div>
      );

    case "product":
      return (
        <div className="px-5 py-4 text-sm text-slate-700 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Product
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {detail.category}
            </span>
          </div>

          <DetailRow
            label="Price"
            value={`₹${detail.price_per_unit} / ${detail.unit_type}`}
          />
          <DetailRow label="Seller" value={detail.seller_name} />
          <DetailRow
            label="Available"
            value={`${detail.available_quantity} ${detail.unit_type}`}
          />
          <DetailRow
            label="Min. order"
            value={`${detail.min_order_quantity} ${detail.unit_type}`}
          />
          {detail.origin && <DetailRow label="Origin" value={detail.origin} />}
          {detail.certification && (
            <DetailRow label="Certification" value={detail.certification} />
          )}

          <button
            type="button"
            onClick={() => router.push(`/dashboard/productdetails/${detail.productId}`)}
            className="mt-2 w-full rounded-lg bg-[#EA7B7B] px-3 py-2 text-xs font-medium text-white hover:bg-[#d96868]"
          >
            Open product page
          </button>
        </div>
      );

    case "category":
      return (
        <div className="px-5 py-4 text-sm text-slate-700 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Category
            </span>
          </div>
          <DetailRow label="Products in category" value={String(detail.product_count)} />
          <DetailRow label="Sellers offering it" value={String(detail.seller_count)} />
          <p className="text-xs text-slate-500">
            Click a connected product node to drill into a specific listing.
          </p>
        </div>
      );

    case "chat":
      return (
        <div className="px-5 py-4 text-sm text-slate-700 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700">
              Chat history
            </span>
          </div>
          <DetailRow label="Messages" value={String(detail.message_count)} />
          <DetailRow label="Linked products" value={String(detail.product_links)} />
          <DetailRow label="Linked sellers" value={String(detail.seller_links)} />
          <DetailRow
            label="Last activity"
            value={new Date(detail.updated_at).toLocaleString()}
          />
          <p className="text-xs text-slate-500">
            Edges connect this conversation to every product and seller it referenced.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  "agent_conversation_id",
                  detail.conversationId,
                );
              }
              router.push("/dashboard/agent");
            }}
            className="mt-2 w-full rounded-lg bg-[#EA7B7B] px-3 py-2 text-xs font-medium text-white hover:bg-[#d96868]"
          >
            Resume this chat
          </button>
        </div>
      );
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}

// ── Add-note modal ─────────────────────────────────────────────────────────

function AddNoteModal({
  existingIds,
  onClose,
  onSaved,
}: {
  existingIds: Set<string>;
  onClose: () => void;
  onSaved: (slug: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!slug) {
      setError("Title must contain at least one letter or number");
      return;
    }
    if (existingIds.has(slug)) {
      setError(`A note with id "${slug}" already exists`);
      return;
    }
    if (!content.trim()) {
      setError("Content cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("You're signed out — please log in again.");
        return;
      }
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? `Save failed (${res.status})`);
        return;
      }
      onSaved(json.id as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">New note</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Inventory turnover"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-[#EA7B7B]/20 transition focus:border-[#EA7B7B] focus:ring-2"
              autoFocus
            />
            {slug && (
              <p className="mt-1 text-[11px] text-slate-400">
                Filename: <span className="font-mono text-slate-500">{slug}.md</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Content (markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError(null);
              }}
              rows={10}
              placeholder={"# Title\n\nWrite your note here. Use [[other-note]] to link."}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 outline-none ring-[#EA7B7B]/20 transition focus:border-[#EA7B7B] focus:ring-2"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Tip: link to other notes with{" "}
              <span className="font-mono text-slate-500">[[note-id]]</span>.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EA7B7B] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#d96868] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
