"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product, ProductCategory } from "@/lib/product";
import { formatPrice, parseAttributes } from "@/lib/productService";
import { supabase } from "@/lib/supabaseClient";
import { addToCart } from "@/lib/cartService";
import {
  Gem,
  TreePine,
  Layers,
  Fuel,
  Leaf,
  MapPin,
  Truck,
  Clock,
  Award,
  FileCheck,
  ShoppingCart,
  Heart,
  Share2,
  Box,
  Warehouse,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  Send,
  Bot,
  User,
} from "lucide-react";

interface ProductDetailsCardProps {
  product: Product;
}

export default function ProductDetailsCard({
  product,
}: ProductDetailsCardProps) {
  const router = useRouter();
  const attributes = parseAttributes(product.dynamic_attributes);
  const [user, setUser] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Chat state
  type DbMessage = {
    id: number;
    created_at: string;
    sender_id: string | null;
    receiver_id: string | null;
    sender_role: "buyer" | "ai";
    content: string;
    product_id: string;
  };
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<DbMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const suggestedQuestions = [
    "What is the minimum order quantity?",
    "What certifications does this product have?",
    "What is the lead time for delivery?",
    "What packing types are available?",
  ];

  // Load existing messages + subscribe to real-time inserts
  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    // Fetch messages where the user is either the sender or the receiver
    supabase
      .from("messages")
      .select("id, created_at, sender_role, content, product_id, sender_id, receiver_id")
      .eq("product_id", product.id)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setChatMessages(data as DbMessage[]);
      });

    const channel = supabase
      .channel(`product-chat-${product.id}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `product_id=eq.${product.id}`,
        },
        (payload) => {
          const incoming = payload.new as DbMessage;
          // Only show messages where this user is the sender or receiver
          const isRelevant =
            incoming.sender_id === userId || incoming.receiver_id === userId;
          if (!isRelevant) return;

          setChatMessages((prev) => {
            // Skip if already present by real DB id
            if (prev.some((m) => m.id === incoming.id)) return prev;
            // Replace the temp optimistic message with the persisted one (matched by content + role)
            const tempIndex = prev.findIndex(
              (m) => m.id > 1_700_000_000_000 && m.sender_role === incoming.sender_role && m.content === incoming.content
            );
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = incoming;
              return updated;
            }
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id, user?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatStreaming]);

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatStreaming) return;
    setChatInput("");
    setChatStreaming(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session?.access_token || !session.user) {
      setChatStreaming(false);
      router.push("/login");
      return;
    }

    // Optimistically add buyer message to UI
    const tempBuyerMsg: DbMessage = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      sender_id: session.user.id,
      receiver_id: null,
      sender_role: "buyer",
      content: text.trim(),
      product_id: product.id,
    };
    setChatMessages((prev) => [...prev, tempBuyerMsg]);

    // Build history in AI SDK format for the API
    const history = [
      ...chatMessages.map((m) => ({
        role: m.sender_role === "buyer" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user" as const, content: text.trim() },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productId: product.id, messages: history }),
      });

      if (!res.ok) {
        setChatStreaming(false);
        return;
      }

      // Read plain text stream from toTextStreamResponse
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let aiText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiText += decoder.decode(value, { stream: true });
        }
        if (aiText.trim()) {
          const tempAiMsg: DbMessage = {
            id: Date.now() + 1,
            created_at: new Date().toISOString(),
            sender_id: null,
            receiver_id: session.user.id,
            sender_role: "ai",
            content: aiText.trim(),
            product_id: product.id,
          };
          setChatMessages((prev) => [...prev, tempAiMsg]);
        } else {
          const errorMsg: DbMessage = {
            id: Date.now() + 1,
            created_at: new Date().toISOString(),
            sender_id: null,
            receiver_id: session.user.id,
            sender_role: "ai",
            content: "Sorry, I'm temporarily unavailable. Please try again in a few minutes.",
            product_id: product.id,
          };
          setChatMessages((prev) => [...prev, errorMsg]);
        }
      } else {
        console.warn("[chat] res.body is null");
      }
    } catch (err) {
      console.error("[chat] caught error:", err);
    } finally {
      setChatStreaming(false);
      chatInputRef.current?.focus();
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setAdding(true);
    const success = await addToCart(user.id, product.id);
    setAdding(false);
    if (success) {
      setNotification({ message: `${product.name} added to cart!`, type: "success" });
    } else {
      setNotification({ message: "Failed to add to cart", type: "error" });
    }
  };

  // Category icons mapping
  const CategoryIcons: Record<ProductCategory, typeof Gem> = {
    Minerals: Gem,
    Wood: TreePine,
    Aggregates: Layers,
    "Fossil Fuels": Fuel,
    "Natural Fibers": Leaf,
  };

  const CategoryIcon =
    CategoryIcons[product.category as ProductCategory] || Gem;

  // Generate a gradient based on category
  const categoryGradients: Record<string, string> = {
    Minerals: "from-slate-600 to-slate-800",
    Wood: "from-amber-600 to-amber-800",
    Aggregates: "from-stone-500 to-stone-700",
    "Fossil Fuels": "from-gray-700 to-gray-900",
    "Natural Fibers": "from-green-600 to-green-800",
  };

  const gradient =
    categoryGradients[product.category] || "from-gray-600 to-gray-800";

  // Get the first image URL
  const getImageUrl = (): string | null => {
    if (!product.image_urls) return null;
    if (Array.isArray(product.image_urls)) {
      return product.image_urls[0] || null;
    }
    // Handle if it's a JSON string
    try {
      const parsed = JSON.parse(product.image_urls);
      if (Array.isArray(parsed)) return parsed[0] || null;
      return product.image_urls;
    } catch {
      return product.image_urls;
    }
  };

  const imageUrl = getImageUrl();
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-lg border flex items-center gap-3 ${notification.type === "success"
            ? "bg-green-50 border-green-100 text-green-700"
            : "bg-red-50 border-red-100 text-red-700"
            }`}>
            {notification.type === "success" ? (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image/Icon Section */}
        <div className="space-y-6">
          <div
            className={`relative h-80 lg:h-96 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden ${imageUrl && !imageError ? "bg-gray-50 border border-gray-200" : `bg-gradient-to-br ${gradient}`}`}
          >
            {imageUrl && !imageError ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-contain p-6"
                onError={() => setImageError(true)}
              />
            ) : (
              <CategoryIcon className="w-32 h-32 text-white/80" strokeWidth={1} />
            )}
            <span className="absolute top-4 left-4 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-700">
              {product.category}
            </span>
          </div>

          {/* Dynamic Attributes */}
          {Object.keys(attributes).length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Specifications
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 capitalize">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {product.name}
            </h1>
            <p className="text-gray-600 mt-3 leading-relaxed">
              {product.description}
            </p>

            {/* Price Section */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-gray-500">Price per unit</p>
                  <p className="text-3xl font-bold text-[#EA7B7B]">
                    {formatPrice(product.price_per_unit, product.unit_type)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Minimum Order</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {product.min_order_quantity} {product.unit_type}
                  </p>
                </div>
              </div>

              {/* Availability */}
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-600 font-medium">
                  {product.available_quantity} {product.unit_type} available
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                {adding ? "Adding..." : "Add to Cart"}
              </button>
              <button
                onClick={() => router.push(`/dashboard/homepage/components/buy/${product.id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                <Zap className="w-5 h-5" />
                Buy Now
              </button>
              <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Origin & Source */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#EA7B7B]" />
              Origin & Source
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {product.origin_country && (
                <div>
                  <p className="text-sm text-gray-500">Country</p>
                  <p className="font-medium text-gray-900">
                    {product.origin_country}
                  </p>
                </div>
              )}
              {product.origin_state && (
                <div>
                  <p className="text-sm text-gray-500">State</p>
                  <p className="font-medium text-gray-900">
                    {product.origin_state}
                  </p>
                </div>
              )}
              {product.origin_district && (
                <div>
                  <p className="text-sm text-gray-500">District</p>
                  <p className="font-medium text-gray-900">
                    {product.origin_district}
                  </p>
                </div>
              )}
              {product.source_name && (
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="font-medium text-gray-900">
                    {product.source_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quality & Certification */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#EA7B7B]" />
              Quality & Certification
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {product.quality_grade && (
                <div>
                  <p className="text-sm text-gray-500">Quality Grade</p>
                  <p className="font-medium text-gray-900">
                    {product.quality_grade}
                  </p>
                </div>
              )}
              {product.certification && (
                <div>
                  <p className="text-sm text-gray-500">Certification</p>
                  <p className="font-medium text-gray-900">
                    {product.certification}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Test Report</p>
                <p className="font-medium text-gray-900">
                  {product.test_report_available ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <FileCheck className="w-4 h-4" />
                      Available
                    </span>
                  ) : (
                    "Not Available"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#EA7B7B]" />
              Logistics & Delivery
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {product.packing_type && (
                <div className="flex items-start gap-3">
                  <Box className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Packing Type</p>
                    <p className="font-medium text-gray-900">
                      {product.packing_type}
                    </p>
                  </div>
                </div>
              )}
              {product.storage_type && (
                <div className="flex items-start gap-3">
                  <Warehouse className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Storage Type</p>
                    <p className="font-medium text-gray-900">
                      {product.storage_type}
                    </p>
                  </div>
                </div>
              )}
              {product.transport_mode && (
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Transport Mode</p>
                    <p className="font-medium text-gray-900">
                      {product.transport_mode}
                    </p>
                  </div>
                </div>
              )}
              {product.lead_time_days && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Lead Time</p>
                    <p className="font-medium text-gray-900">
                      {product.lead_time_days} days
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Chat Panel */}
        {chatOpen && (
          <div className="w-[420px] sm:w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#EA7B7B]">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-white" />
                <div>
                  <p className="text-sm font-semibold text-white">Product Assistant</p>
                  <p className="text-xs text-white/70 truncate max-w-[180px]">{product.name}</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/50">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <p className="text-xs text-gray-500 text-center">
                    Ask anything about this product
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendChatMessage(q)}
                        className="text-xs text-left px-3 py-2 rounded-xl border border-[#EA7B7B]/20 text-gray-700 hover:bg-[#EA7B7B]/5 hover:border-[#EA7B7B]/40 transition-colors bg-white"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.sender_role === "buyer" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center ${
                          msg.sender_role === "buyer" ? "bg-gray-900" : "bg-[#EA7B7B]"
                        }`}
                      >
                        {msg.sender_role === "buyer" ? (
                          <User className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <div
                        className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          msg.sender_role === "buyer"
                            ? "bg-gray-900 text-white rounded-br-sm"
                            : "bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {/* Typing indicator while waiting for AI response via real-time */}
                  {chatStreaming && (
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center bg-[#EA7B7B]">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-white border border-gray-100 shadow-sm">
                        <span className="flex items-center gap-1 py-0.5">
                          <span className="w-1.5 h-1.5 bg-[#EA7B7B] rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-[#EA7B7B] rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-[#EA7B7B] rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChatMessage(chatInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={chatStreaming}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/30 focus:border-[#EA7B7B] focus:bg-white placeholder-gray-400 disabled:opacity-50 transition"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatStreaming}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#EA7B7B] text-white hover:bg-[#d96a6a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {chatStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => {
            setChatOpen((prev) => !prev);
            if (!chatOpen) setTimeout(() => chatInputRef.current?.focus(), 100);
          }}
          className="w-14 h-14 bg-[#EA7B7B] hover:bg-[#d96a6a] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center relative"
        >
          {chatOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
          {chatMessages.length > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {chatMessages.filter((m) => m.sender_role === "ai").length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
