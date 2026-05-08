"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowUp,
  Sparkles,
  Users,
  BarChart3,
  Scale,
  TrendingUp,
  BadgeCheck,
  Loader2,
  Search,
  Building2,
  MapPin,
  Package,
  Clock,
  IndianRupee,
  ShoppingCart,
  Box,
  Tag,
  ImageOff,
  Trash2,
  Pencil,
  XCircle,
  CreditCard,
  ArrowRight,
  Plus,
  History,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "../homepage/components/Sidebar";
import Topbar from "../homepage/components/Topbar";

const SUGGESTED_PROMPTS = [
  {
    icon: Users,
    title: "Find sellers",
    prompt: "Find sellers of natural fibers on the marketplace",
  },
  {
    icon: Scale,
    title: "Compare sellers",
    prompt: "Compare the top sellers of basmati rice on price and certifications",
  },
  {
    icon: BarChart3,
    title: "Analyse with charts",
    prompt: "Show me a chart of average cardamom prices grouped by origin state",
  },
  {
    icon: TrendingUp,
    title: "Price trends",
    prompt: "What is the price trend for black pepper over the last 6 months?",
  },
];

type SellerResult = {
  id: string;
  business_name: string;
  business_type: string | null;
  business_address: string | null;
  is_verified: boolean;
  contact_person: string | null;
  product_count: number;
  categories: string[];
  certifications: string[];
  sample_products: { name: string; category: string; price_per_unit: string; unit_type: string }[];
};

type SearchSellersOutput = {
  query: string | null;
  category: string | null;
  count: number;
  sellers: SellerResult[];
  error?: string;
};

type SellerDetailsOutput = {
  seller: {
    id: string;
    business_name: string;
    business_type: string | null;
    business_address: string | null;
    gstin: string | null;
    is_verified: boolean;
    contact_person: string | null;
  };
  stats: {
    listing_count: number;
    categories: string[];
    certifications: string[];
    origin_countries: string[];
    avg_price_by_category: { category: string; avg_price: number; unit_type: string; count: number }[];
  };
  products: {
    id: string;
    name: string;
    category: string;
    price_per_unit: string;
    unit_type: string;
    lead_time_days: number | null;
    certification: string | null;
    origin_country: string | null;
    available_quantity: string;
    quality_grade: string | null;
  }[];
  error?: string;
};

type CompareSellersRow = {
  id: string;
  business_name: string;
  business_type: string | null;
  is_verified: boolean;
  listing_count: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_lead_time_days: number | null;
  unit_type: string | null;
  categories: string[];
  certifications: string[];
  origin_countries: string[];
};

type CompareSellersOutput = {
  category: string | null;
  count: number;
  sellers: CompareSellersRow[];
  error?: string;
};

const CHART_COLORS = ["#EA7B7B", "#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7"];

type ProductSearchRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  price_per_unit: string;
  unit_type: string;
  available_quantity: string;
  min_order_quantity: string;
  lead_time_days: number | null;
  certification: string | null;
  origin: string | null;
  quality_grade: string | null;
  image_url: string | null;
  seller_id: string;
  seller_name: string;
};

type SearchProductsOutput = {
  query: string | null;
  category: string | null;
  count: number;
  products: ProductSearchRow[];
  error?: string;
};

type ProductDetailsOutput = {
  product: {
    id: string;
    name: string;
    category: string;
    description: string;
    price_per_unit: string;
    unit_type: string;
    available_quantity: string;
    min_order_quantity: string;
    availability_status: string | null;
    origin: string | null;
    quality_grade: string | null;
    certification: string | null;
    test_report_available: boolean;
    lead_time_days: number | null;
    packing_type: string | null;
    storage_type: string | null;
    transport_mode: string | null;
    image_url: string | null;
    attributes: Record<string, unknown>;
  };
  seller: {
    id: string;
    business_name: string;
    business_type: string | null;
    is_verified: boolean;
  } | null;
  error?: string;
};

type CartItemRow = {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  category: string | null;
  quantity: number;
  unit_type: string;
  price_per_unit: number;
  line_total: number;
  image_url: string | null;
};

type ViewCartOutput = {
  item_count: number;
  line_count?: number;
  total_value: number;
  items: CartItemRow[];
  error?: string;
};

type AddToCartOutput = {
  action: "added" | "increased";
  product: {
    id: string;
    name: string;
    unit_type: string;
    price_per_unit: number;
    image_url: string | null;
  };
  quantity_added: number;
  cart_quantity_after: number;
  line_total: number;
  error?: string;
};

const CONVERSATION_ID_KEY = "agent_conversation_id";

type ConversationRow = {
  id: string;
  title: string | null;
  updated_at: string;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getOrCreateConversationId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }
  const stored = window.localStorage.getItem(CONVERSATION_ID_KEY);
  if (stored) return stored;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(CONVERSATION_ID_KEY, fresh);
  return fresh;
}

export default function AgentPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>("");
  const conversationIdRef = useRef<string>("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [convListLoading, setConvListLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getOrCreateConversationId();
    setConversationId(id);
    conversationIdRef.current = id;
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
      setAuthLoading(false);
    };
    checkUser();
  }, [router]);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent",
      body: () => ({ conversationId: conversationIdRef.current }),
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  });

  // Load saved messages for the current conversation on mount / when it changes.
  useEffect(() => {
    if (!conversationId || authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      const { data, error: loadErr } = await supabase
        .from("agent_messages")
        .select("id, role, parts, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (loadErr) {
        console.error(
          "[agent] Failed to load conversation:",
          loadErr.message,
          "— if this says 'relation \"public.agent_messages\" does not exist', run supabase/agent_chat_schema.sql in your Supabase SQL editor.",
        );
        setMessages([]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((data ?? []).map((r: any) => ({ id: r.id, role: r.role, parts: r.parts })));
      }
      setHistoryLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, authLoading, user, setMessages]);

  const handleNewChat = () => {
    const fresh = crypto.randomUUID();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONVERSATION_ID_KEY, fresh);
    }
    conversationIdRef.current = fresh;
    setConversationId(fresh);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
  };

  const loadConversationList = async () => {
    if (!user) return;
    setConvListLoading(true);
    const { data, error: e } = await supabase
      .from("agent_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (e) {
      console.error("[agent] load conversations failed:", e.message);
      setConversations([]);
    } else {
      setConversations((data ?? []) as ConversationRow[]);
    }
    setConvListLoading(false);
  };

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) {
      setHistoryOpen(false);
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONVERSATION_ID_KEY, id);
    }
    conversationIdRef.current = id;
    setConversationId(id);
    setHistoryOpen(false);
    setInput("");
  };

  const handleDeleteConversation = async (id: string) => {
    const { error: e } = await supabase
      .from("agent_conversations")
      .delete()
      .eq("id", id);
    if (e) {
      console.error("[agent] delete conversation failed:", e.message);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === conversationId) {
      handleNewChat();
    }
  };

  // Close history popover when clicking outside
  useEffect(() => {
    if (!historyOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        historyPanelRef.current &&
        !historyPanelRef.current.contains(e.target as Node)
      ) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [historyOpen]);

  // Refresh list when popover opens
  useEffect(() => {
    if (historyOpen) loadConversationList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const handleSubmit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isStreaming) return;
    sendMessage({ text: value });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  if (authLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#EA7B7B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <Topbar user={user} />
      <Sidebar />
      <div className="ml-20 transition-all duration-300">
        {!hasMessages ? (
          <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-12 pb-16">
            <div className="mb-8 flex w-full items-center justify-between">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                SupplAI Assistant
              </div>
              <HistoryButton
                open={historyOpen}
                onToggle={() => setHistoryOpen((v) => !v)}
                panelRef={historyPanelRef}
                conversations={conversations}
                loading={convListLoading}
                activeId={conversationId}
                onSelect={handleSelectConversation}
                onDelete={handleDeleteConversation}
              />
            </div>

            <h1 className="mb-3 text-center text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              How can I help you today?
            </h1>
            <p className="mb-10 max-w-xl text-center text-base text-slate-500">
              Ask me to find sellers, compare suppliers, or analyse the marketplace with charts and insights.
            </p>

            <Composer
              input={input}
              setInput={setInput}
              onSubmit={() => handleSubmit()}
              onKeyDown={handleKeyDown}
              autoResize={autoResize}
              textareaRef={textareaRef}
              isStreaming={isStreaming}
            />

            <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map(({ icon: Icon, title, prompt }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleSubmit(prompt)}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">{title}</span>
                    <span className="mt-0.5 text-xs text-slate-500 line-clamp-2">{prompt}</span>
                  </span>
                </button>
              ))}
            </div>
          </main>
        ) : (
          <div className="flex h-[calc(100vh-68px)] flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  SupplAI Assistant
                </div>
                <div className="flex items-center gap-2">
                  <HistoryButton
                    open={historyOpen}
                    onToggle={() => setHistoryOpen((v) => !v)}
                    panelRef={historyPanelRef}
                    conversations={conversations}
                    loading={convListLoading}
                    activeId={conversationId}
                    onSelect={handleSelectConversation}
                    onDelete={handleDeleteConversation}
                  />
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New chat
                  </button>
                </div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl px-4 py-8">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {isStreaming && messages[messages.length - 1]?.role === "user" && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </div>
                )}
                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error.message || "Something went wrong."}
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white">
              <div className="mx-auto w-full max-w-3xl px-4 py-4">
                <Composer
                  input={input}
                  setInput={setInput}
                  onSubmit={() => handleSubmit()}
                  onKeyDown={handleKeyDown}
                  autoResize={autoResize}
                  textareaRef={textareaRef}
                  isStreaming={isStreaming}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryButton({
  open,
  onToggle,
  panelRef,
  conversations,
  loading,
  activeId,
  onSelect,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  conversations: ConversationRow[];
  loading: boolean;
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
          open
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <History className="h-3.5 w-3.5" />
        History
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-700">Recent chats</span>
            <span className="text-[10px] text-slate-400">
              {conversations.length} saved
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-3 py-8 text-center text-xs text-slate-500">
                <MessageSquare className="h-5 w-5 text-slate-300" />
                No previous chats yet.
              </div>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <li
                      key={c.id}
                      className={`group flex items-start gap-2 border-b border-slate-50 px-3 py-2.5 transition last:border-b-0 ${
                        isActive ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                      >
                        <span
                          className={`flex w-full items-center gap-1.5 truncate text-xs ${
                            isActive
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {isActive && (
                            <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#EA7B7B]" />
                          )}
                          <span className="truncate">{c.title || "Untitled chat"}</span>
                        </span>
                        <span className="mt-0.5 text-[10px] text-slate-400">
                          {formatRelative(c.updated_at)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this chat?")) onDelete(c.id);
                        }}
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  input,
  setInput,
  onSubmit,
  onKeyDown,
  autoResize,
  textareaRef,
  isStreaming,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoResize: (el: HTMLTextAreaElement) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isStreaming: boolean;
}) {
  return (
    <div className="w-full">
      <div className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-slate-400 focus-within:shadow-md">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about buyers, sellers, or the market…"
          rows={1}
          className="block w-full resize-none rounded-2xl bg-transparent px-5 py-4 pr-14 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!input.trim() || isStreaming}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          aria-label="Send"
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-6 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "w-full"}`}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-2.5 text-sm text-white">
            {message.parts
              ?.filter((p: { type: string }) => p.type === "text")
              .map((p: { text: string }, i: number) => (
                <span key={i} className="whitespace-pre-wrap">{p.text}</span>
              ))}
          </div>
        ) : (
          <div className="space-y-3">
            {message.parts?.map((part: { type: string }, i: number) => {
              if (part.type === "text") {
                return (
                  <div
                    key={i}
                    className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200"
                  >
                    {(part as unknown as { text: string }).text}
                  </div>
                );
              }
              if (part.type === "tool-searchSellers") {
                return <SearchSellersPart key={i} part={part} />;
              }
              if (part.type === "tool-getSellerDetails") {
                return <SellerDetailsPart key={i} part={part} />;
              }
              if (part.type === "tool-compareSellers") {
                return <CompareSellersPart key={i} part={part} />;
              }
              if (part.type === "tool-searchProducts") {
                return <SearchProductsPart key={i} part={part} />;
              }
              if (part.type === "tool-getProductDetails") {
                return <ProductDetailsPart key={i} part={part} />;
              }
              if (part.type === "tool-viewCart") {
                return <ViewCartPart key={i} part={part} />;
              }
              if (part.type === "tool-addToCart") {
                return <AddToCartPart key={i} part={part} />;
              }
              if (part.type === "tool-updateCartItemQuantity") {
                return <UpdateCartPart key={i} part={part} />;
              }
              if (part.type === "tool-removeFromCart") {
                return <RemoveFromCartPart key={i} part={part} />;
              }
              if (part.type === "tool-clearCart") {
                return <ClearCartPart key={i} part={part} />;
              }
              if (part.type === "tool-proceedToCheckout") {
                return <CheckoutPart key={i} part={part} />;
              }
              if (part.type === "tool-findBuyers") {
                return <FindBuyersPart key={i} part={part} />;
              }
              if (part.type === "tool-analyseSellers") {
                return <AnalyseSellersPart key={i} part={part} />;
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchSellersPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  const input = p.input as { query?: string; category?: string } | undefined;

  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Search className="h-3.5 w-3.5 animate-pulse" />
        Searching sellers
        {input?.query ? <span className="font-medium text-slate-800">“{input.query}”</span> : null}
        {input?.category ? <span className="text-slate-500">in {input.category}</span> : null}
        …
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        Search failed: {String(p.errorText ?? "unknown error")}
      </div>
    );
  }

  if (state !== "output-available") return null;

  const output = p.output as SearchSellersOutput;
  if (output.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {output.error}
      </div>
    );
  }
  if (!output.sellers?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        No sellers matched that search.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Search className="h-3.5 w-3.5" />
        Found {output.count} seller{output.count === 1 ? "" : "s"}
        {output.query ? ` for “${output.query}”` : ""}
        {output.category ? ` in ${output.category}` : ""}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {output.sellers.map((s) => (
          <SellerCard key={s.id} seller={s} />
        ))}
      </div>
    </div>
  );
}

function SellerCard({ seller }: { seller: SellerResult }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-900">{seller.business_name}</h3>
            {seller.is_verified && <BadgeCheck className="h-4 w-4 flex-none text-emerald-500" />}
          </div>
          {seller.business_type && (
            <p className="mt-0.5 text-xs text-slate-500">{seller.business_type}</p>
          )}
        </div>
        <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {seller.product_count} listing{seller.product_count === 1 ? "" : "s"}
        </span>
      </div>

      {seller.business_address && (
        <p className="mt-2 line-clamp-1 text-xs text-slate-500">{seller.business_address}</p>
      )}

      {seller.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {seller.categories.slice(0, 4).map((c) => (
            <span
              key={c}
              className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {seller.sample_products.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2">
          {seller.sample_products.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-700">{p.name}</span>
              <span className="flex-none text-slate-500">
                ₹{Number(p.price_per_unit).toLocaleString("en-IN")}/{p.unit_type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolPending({ icon: Icon, label }: { icon: typeof Search; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5 animate-pulse" />
      {label}…
    </div>
  );
}

function ToolError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </div>
  );
}

function SellerDetailsPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";

  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Building2} label="Loading seller profile" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Lookup failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as SellerDetailsOutput;
  if (out.error) return <ToolError message={out.error} />;

  const { seller, stats, products } = out;

  const chartData = stats.avg_price_by_category.map((row) => ({
    category: row.category,
    price: row.avg_price,
    label: `₹${row.avg_price.toLocaleString("en-IN")}/${row.unit_type}`,
  }));

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold text-slate-900">{seller.business_name}</h3>
            {seller.is_verified && <BadgeCheck className="h-4 w-4 flex-none text-emerald-500" />}
          </div>
          {seller.business_type && <p className="text-xs text-slate-500">{seller.business_type}</p>}
        </div>
        <span className="flex-none rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {stats.listing_count} listings
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Stat icon={Package} label="Categories" value={stats.categories.length || "—"} />
        <Stat icon={BadgeCheck} label="Certifications" value={stats.certifications.length || "—"} />
        <Stat icon={MapPin} label="Origins" value={stats.origin_countries.length || "—"} />
        <Stat icon={Building2} label="GSTIN" value={seller.gstin ? "Provided" : "—"} />
      </div>

      {seller.business_address && (
        <div className="flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="mt-0.5 h-3 w-3 flex-none" />
          <span>{seller.business_address}</span>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <BarChart3 className="h-3.5 w-3.5" />
            Average price by category
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Avg price"]}
                />
                <Bar dataKey="price" fill="#EA7B7B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Product</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Lead time</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 8).map((pr) => (
                <tr key={pr.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-3 py-2">{pr.name}</td>
                  <td className="px-3 py-2 text-slate-500">{pr.category}</td>
                  <td className="px-3 py-2 text-right">
                    ₹{Number(pr.price_per_unit).toLocaleString("en-IN")}/{pr.unit_type}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {pr.lead_time_days != null ? `${pr.lead_time_days}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 8 && (
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
              +{products.length - 8} more listings
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
        <div className="truncate text-xs font-medium text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function CompareSellersPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";

  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Scale} label="Comparing sellers" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Comparison failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as CompareSellersOutput;
  if (out.error) return <ToolError message={out.error} />;
  if (!out.sellers?.length) return <ToolError message="No sellers to compare." />;

  const shortName = (n: string) => (n.length > 18 ? n.slice(0, 17) + "…" : n);

  const priceData = out.sellers.map((s) => ({
    name: shortName(s.business_name),
    fullName: s.business_name,
    value: s.avg_price ?? 0,
    unit: s.unit_type,
  }));
  const leadTimeData = out.sellers.map((s) => ({
    name: shortName(s.business_name),
    fullName: s.business_name,
    value: s.avg_lead_time_days ?? 0,
  }));
  const listingsData = out.sellers.map((s) => ({
    name: shortName(s.business_name),
    fullName: s.business_name,
    value: s.listing_count,
  }));

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Scale className="h-3.5 w-3.5" />
        Comparing {out.count} sellers
        {out.category ? ` · ${out.category} only` : ""}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Seller</th>
              <th className="px-3 py-2 text-right font-medium">Listings</th>
              <th className="px-3 py-2 text-right font-medium">Avg price</th>
              <th className="px-3 py-2 text-right font-medium">Range</th>
              <th className="px-3 py-2 text-right font-medium">Lead time</th>
              <th className="px-3 py-2 text-left font-medium">Certs</th>
            </tr>
          </thead>
          <tbody>
            {out.sellers.map((s, idx) => (
              <tr key={s.id} className="border-t border-slate-100 text-slate-700">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 flex-none rounded-full"
                      style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="font-medium text-slate-900">{s.business_name}</span>
                    {s.is_verified && <BadgeCheck className="h-3.5 w-3.5 flex-none text-emerald-500" />}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">{s.listing_count}</td>
                <td className="px-3 py-2 text-right">
                  {s.avg_price != null
                    ? `₹${s.avg_price.toLocaleString("en-IN")}${s.unit_type ? `/${s.unit_type}` : ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right text-slate-500">
                  {s.min_price != null && s.max_price != null
                    ? `₹${s.min_price.toLocaleString("en-IN")} – ₹${s.max_price.toLocaleString("en-IN")}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {s.avg_lead_time_days != null ? `${s.avg_lead_time_days}d` : "—"}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {s.certifications.length ? s.certifications.slice(0, 2).join(", ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ComparisonChart
          icon={IndianRupee}
          title="Average price"
          data={priceData}
          formatter={(v) => `₹${v.toLocaleString("en-IN")}`}
        />
        <ComparisonChart
          icon={Clock}
          title="Average lead time (days)"
          data={leadTimeData}
          formatter={(v) => `${v}d`}
        />
        <ComparisonChart
          icon={Package}
          title="Listings"
          data={listingsData}
          formatter={(v) => `${v}`}
        />
      </div>
    </div>
  );
}

function ComparisonChart({
  icon: Icon,
  title,
  data,
  formatter,
}: {
  icon: typeof Package;
  title: string;
  data: { name: string; fullName: string; value: number }[];
  formatter: (v: number) => string;
}) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="h-44 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={formatter} width={50} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(value) => [formatter(Number(value)), title]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

function ProductThumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  // Plain <img> to avoid next/image domain config; thumbnails are small.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="h-full w-full object-cover" />;
}

function SearchProductsPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  const input = p.input as { query?: string; category?: string } | undefined;

  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Search className="h-3.5 w-3.5 animate-pulse" />
        Searching products
        {input?.query ? <span className="font-medium text-slate-800">“{input.query}”</span> : null}
        {input?.category ? <span className="text-slate-500">in {input.category}</span> : null}
        …
      </div>
    );
  }
  if (state === "output-error") {
    return <ToolError message={`Search failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as SearchProductsOutput;
  if (out.error) return <ToolError message={out.error} />;
  if (!out.products?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        No products matched that search.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Search className="h-3.5 w-3.5" />
        Found {out.count} product{out.count === 1 ? "" : "s"}
        {out.query ? ` for “${out.query}”` : ""}
        {out.category ? ` in ${out.category}` : ""}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {out.products.map((pr) => (
          <ProductCard key={pr.id} product={pr} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ProductSearchRow }) {
  const price = Number(product.price_per_unit);
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow">
      <div className="h-20 w-20 flex-none overflow-hidden rounded-lg bg-slate-100">
        <ProductThumb url={product.image_url} alt={product.name} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">{product.name}</h3>
          <span className="flex-none text-xs font-semibold text-slate-900">
            ₹{price.toLocaleString("en-IN")}
            <span className="text-[10px] font-normal text-slate-500">/{product.unit_type}</span>
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
          <Building2 className="h-3 w-3" /> {product.seller_name}
          <span className="text-slate-300">·</span>
          <Tag className="h-3 w-3" /> {product.category}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
          {product.origin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200">
              <MapPin className="h-2.5 w-2.5" /> {product.origin}
            </span>
          )}
          {product.lead_time_days != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200">
              <Clock className="h-2.5 w-2.5" /> {product.lead_time_days}d lead
            </span>
          )}
          {product.certification && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-2.5 w-2.5" /> {product.certification}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span>
            MOQ {product.min_order_quantity} {product.unit_type}
          </span>
          <span>
            {product.available_quantity} {product.unit_type} available
          </span>
        </div>
      </div>
    </div>
  );
}

function ProductDetailsPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";

  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Box} label="Loading product" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Lookup failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as ProductDetailsOutput;
  if (out.error) return <ToolError message={out.error} />;
  const { product, seller } = out;
  const price = Number(product.price_per_unit);

  const attrEntries = Object.entries(product.attributes).filter(([, v]) => v !== null && v !== undefined);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-28 w-28 flex-none overflow-hidden rounded-lg bg-slate-100">
          <ProductThumb url={product.image_url} alt={product.name} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
          {seller && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Building2 className="h-3 w-3" />
              {seller.business_name}
              {seller.is_verified && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
            </p>
          )}
          <div className="mt-2 text-lg font-semibold text-slate-900">
            ₹{price.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-slate-500">/{product.unit_type}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            MOQ {product.min_order_quantity} · {product.available_quantity} {product.unit_type} available
          </div>
        </div>
      </div>

      {product.description && (
        <p className="text-xs text-slate-700">{product.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Stat icon={MapPin} label="Origin" value={product.origin ?? "—"} />
        <Stat icon={Clock} label="Lead time" value={product.lead_time_days != null ? `${product.lead_time_days}d` : "—"} />
        <Stat icon={BadgeCheck} label="Certification" value={product.certification ?? "—"} />
        <Stat icon={Tag} label="Quality grade" value={product.quality_grade ?? "—"} />
      </div>

      {attrEntries.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <tbody>
              {attrEntries.slice(0, 8).map(([k, v]) => (
                <tr key={k} className="border-t border-slate-100 first:border-t-0">
                  <td className="bg-slate-50 px-3 py-1.5 text-slate-500">{k.replace(/_/g, " ")}</td>
                  <td className="px-3 py-1.5 text-slate-800">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ViewCartPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";

  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={ShoppingCart} label="Reading your cart" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Cart failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as ViewCartOutput;
  if (out.error) return <ToolError message={out.error} />;

  if (!out.items.length) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        <ShoppingCart className="h-3.5 w-3.5" />
        Your cart is empty.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-600">
          <ShoppingCart className="h-3.5 w-3.5" />
          {out.line_count ?? out.items.length} line{(out.line_count ?? out.items.length) === 1 ? "" : "s"} ·{" "}
          {out.item_count} unit{out.item_count === 1 ? "" : "s"}
        </span>
        <span className="font-semibold text-slate-900">
          ₹{out.total_value.toLocaleString("en-IN")}
        </span>
      </div>
      <ul className="space-y-2">
        {out.items.map((it) => (
          <li key={it.cart_item_id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
            <div className="h-12 w-12 flex-none overflow-hidden rounded-md bg-slate-100">
              <ProductThumb url={it.image_url} alt={it.product_name} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-900">{it.product_name}</div>
              <div className="text-[10px] text-slate-500">
                {it.quantity} × ₹{it.price_per_unit.toLocaleString("en-IN")}/{it.unit_type}
              </div>
            </div>
            <div className="flex-none text-xs font-medium text-slate-900">
              ₹{it.line_total.toLocaleString("en-IN")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddToCartPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";

  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={ShoppingCart} label="Adding to cart" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Add failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as AddToCartOutput;
  if (out.error) return <ToolError message={out.error} />;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-sm">
      <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-emerald-200">
        {out.product.image_url ? (
          <ProductThumb url={out.product.image_url} alt={out.product.name} />
        ) : (
          <ShoppingCart className="h-5 w-5 text-emerald-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
          <BadgeCheck className="h-3.5 w-3.5" />
          {out.action === "added" ? "Added to cart" : "Updated cart"}
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{out.product.name}</div>
        <div className="text-[11px] text-slate-600">
          {out.action === "increased"
            ? `+${out.quantity_added} ${out.product.unit_type} · now ${out.cart_quantity_after} in cart`
            : `${out.quantity_added} ${out.product.unit_type} in cart`}
        </div>
      </div>
      <div className="flex-none text-right">
        <div className="text-xs text-slate-500">Line total</div>
        <div className="text-sm font-semibold text-slate-900">
          ₹{out.line_total.toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

type UpdateCartOutput = {
  cart_item_id: string;
  product: { id: string; name: string; unit_type: string; price_per_unit: number; image_url: string | null };
  previous_quantity: number;
  new_quantity: number;
  line_total: number;
  error?: string;
};

function UpdateCartPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Pencil} label="Updating quantity" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Update failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as UpdateCartOutput;
  if (out.error) return <ToolError message={out.error} />;

  const direction = out.new_quantity > out.previous_quantity ? "increased" : "decreased";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 shadow-sm">
      <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-blue-200">
        {out.product.image_url ? (
          <ProductThumb url={out.product.image_url} alt={out.product.name} />
        ) : (
          <Pencil className="h-5 w-5 text-blue-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
          <Pencil className="h-3.5 w-3.5" />
          Quantity {direction}
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{out.product.name}</div>
        <div className="text-[11px] text-slate-600">
          {out.previous_quantity} → {out.new_quantity} {out.product.unit_type}
        </div>
      </div>
      <div className="flex-none text-right">
        <div className="text-xs text-slate-500">Line total</div>
        <div className="text-sm font-semibold text-slate-900">
          ₹{out.line_total.toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

type RemoveFromCartOutput = {
  removed_cart_item_id: string;
  product_name: string;
  removed_quantity: number;
  unit_type: string;
  image_url: string | null;
  error?: string;
};

function RemoveFromCartPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Trash2} label="Removing item" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Remove failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as RemoveFromCartOutput;
  if (out.error) return <ToolError message={out.error} />;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3 shadow-sm">
      <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-rose-200">
        {out.image_url ? (
          <ProductThumb url={out.image_url} alt={out.product_name} />
        ) : (
          <Trash2 className="h-5 w-5 text-rose-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
          <XCircle className="h-3.5 w-3.5" />
          Removed from cart
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{out.product_name}</div>
        <div className="text-[11px] text-slate-600">
          {out.removed_quantity} {out.unit_type} taken out
        </div>
      </div>
    </div>
  );
}

type ClearCartOutput = { items_removed: number; error?: string };

function ClearCartPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Trash2} label="Clearing cart" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Clear failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as ClearCartOutput;
  if (out.error) return <ToolError message={out.error} />;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs text-rose-800 shadow-sm">
      <Trash2 className="h-3.5 w-3.5" />
      Cart cleared · {out.items_removed} line{out.items_removed === 1 ? "" : "s"} removed
    </div>
  );
}

type CheckoutOutput = {
  checkout_url: string;
  line_count: number;
  item_count: number;
  total_value: number;
  error?: string;
};

function CheckoutPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={CreditCard} label="Preparing checkout" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Checkout failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as CheckoutOutput;
  if (out.error) return <ToolError message={out.error} />;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
        <CreditCard className="h-3.5 w-3.5" />
        Ready to check out
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="text-slate-600">
          {out.line_count} line{out.line_count === 1 ? "" : "s"} · {out.item_count} unit
          {out.item_count === 1 ? "" : "s"}
        </span>
        <span className="text-2xl font-semibold text-slate-900">
          ₹{out.total_value.toLocaleString("en-IN")}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        I&apos;ve set everything up. Tap below to review your order and pay — only you can complete the payment.
      </p>
      <Link
        href={out.checkout_url}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Review & pay
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

type FindBuyersOutput = {
  query: string | null;
  count: number;
  buyers: {
    id: string;
    business_name: string;
    business_type: string | null;
    business_address: string | null;
    is_verified: boolean;
  }[];
  error?: string;
};

function FindBuyersPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={Users} label="Searching buyers" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Lookup failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as FindBuyersOutput;
  if (out.error) return <ToolError message={out.error} />;
  if (!out.buyers.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        No buyers matched that search.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Users className="h-3.5 w-3.5" />
        Found {out.count} buyer{out.count === 1 ? "" : "s"}
        {out.query ? ` for “${out.query}”` : ""}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {out.buyers.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{b.business_name}</h3>
                  {b.is_verified && <BadgeCheck className="h-4 w-4 flex-none text-emerald-500" />}
                </div>
                {b.business_type && (
                  <p className="mt-0.5 text-xs text-slate-500">{b.business_type}</p>
                )}
              </div>
            </div>
            {b.business_address && (
              <p className="mt-2 line-clamp-1 text-xs text-slate-500">{b.business_address}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

type AnalyseSellersOutput = {
  metric: "avg_price" | "avg_lead_time" | "listing_count";
  groupBy: "category" | "origin_country" | "certification" | "seller";
  category: string | null;
  count: number;
  groups: { label: string; value: number; unit: string | null; sample_size: number }[];
  error?: string;
};

const METRIC_LABEL: Record<AnalyseSellersOutput["metric"], string> = {
  avg_price: "Average price",
  avg_lead_time: "Average lead time (days)",
  listing_count: "Listing count",
};

const GROUPBY_LABEL: Record<AnalyseSellersOutput["groupBy"], string> = {
  category: "category",
  origin_country: "origin country",
  certification: "certification",
  seller: "seller",
};

function AnalyseSellersPart({ part }: { part: { type: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;
  const state: string = p.state ?? "";
  if (state === "input-streaming" || state === "input-available") {
    return <ToolPending icon={BarChart3} label="Crunching the numbers" />;
  }
  if (state === "output-error") {
    return <ToolError message={`Analysis failed: ${String(p.errorText ?? "unknown error")}`} />;
  }
  if (state !== "output-available") return null;

  const out = p.output as AnalyseSellersOutput;
  if (out.error) return <ToolError message={out.error} />;
  if (!out.groups.length) {
    return <ToolError message="Not enough data to chart that breakdown." />;
  }

  const isPrice = out.metric === "avg_price";
  const formatter = (v: number) =>
    isPrice ? `₹${v.toLocaleString("en-IN")}` : out.metric === "avg_lead_time" ? `${v}d` : `${v}`;

  const shortLabel = (l: string) => (l.length > 16 ? l.slice(0, 15) + "…" : l);
  const data = out.groups.map((g, idx) => ({
    name: shortLabel(g.label),
    fullName: g.label,
    value: g.value,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <BarChart3 className="h-3.5 w-3.5" />
        {METRIC_LABEL[out.metric]} by {GROUPBY_LABEL[out.groupBy]}
        {out.category ? ` · ${out.category} only` : ""}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={formatter} width={60} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(value) => [formatter(Number(value)), METRIC_LABEL[out.metric]]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((d, idx) => (
                <Cell key={idx} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
